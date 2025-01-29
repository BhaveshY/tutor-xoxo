import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../lib/supabaseClient.ts';
import { Spinner } from './Spinner.tsx';
import { Alert } from './Alert.tsx';
import { Paper, Stack, Text, Group, Button } from '@mantine/core';

interface Analysis {
  pace: string;
  engagement: string;
  performance: string;
}

interface EvaluationResponse {
  content: string;
  analysis: Analysis;
}

interface DBPracticeSession {
  timestamp: string;
  topic: string;
  duration: number;
  performance: 'excellent' | 'good' | 'fair' | 'needs_improvement';
  notes?: string;
}

interface DBTutorInteraction {
  timestamp: string;
  topic: string;
  message_count: number;
  duration: number;
  understanding: 'high' | 'medium' | 'low';
}

export function Evaluation() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null);

  useEffect(() => {
    fetchEvaluation();
  }, []);

  const fetchEvaluation = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user ID from session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch roadmap progress
      const { data: roadmapData } = await supabase
        .from('roadmap_progress')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Fetch practice sessions
      const { data: practiceSessions } = await supabase
        .from('practice_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false });

      // Fetch tutor interactions
      const { data: tutorInteractions } = await supabase
        .from('tutor_interactions')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false });

      // Prepare progress data
      const progressData = {
        userId: user.id,
        roadmapProgress: roadmapData ? {
          completedTopics: roadmapData.completed_topics || [],
          currentTopic: roadmapData.current_topic,
          lastUpdated: roadmapData.last_updated
        } : undefined,
        practiceSessions: practiceSessions?.map((session: DBPracticeSession) => ({
          timestamp: session.timestamp,
          topic: session.topic,
          duration: session.duration,
          performance: session.performance,
          notes: session.notes
        })),
        tutorInteractions: tutorInteractions?.map((interaction: DBTutorInteraction) => ({
          timestamp: interaction.timestamp,
          topic: interaction.topic,
          messageCount: interaction.message_count,
          duration: interaction.duration,
          understanding: interaction.understanding
        }))
      };

      // Call evaluator function
      const { data: evaluationData, error: functionError } = await supabase.functions
        .invoke('evaluator', {
          body: { progressData }
        });

      if (functionError) throw functionError;
      setEvaluation(evaluationData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch evaluation');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert type="error" message={error} />
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="p-4">
        <Alert type="info" message="No evaluation data available." />
      </div>
    );
  }

  return (
    <Stack gap="lg">
      {/* Quick Stats */}
      <Group grow>
        <Paper p="md" radius="md" withBorder>
          <Text size="sm" c="dimmed">Learning Pace</Text>
          <Text size="lg" fw={500} mt={2}>{evaluation.analysis.pace}</Text>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Text size="sm" c="dimmed">Engagement</Text>
          <Text size="lg" fw={500} mt={2}>{evaluation.analysis.engagement}</Text>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Text size="sm" c="dimmed">Performance</Text>
          <Text size="lg" fw={500} mt={2}>{evaluation.analysis.performance}</Text>
        </Paper>
      </Group>

      {/* Detailed Evaluation */}
      <Paper p="lg" radius="md" withBorder>
        <div className="prose max-w-none">
          <ReactMarkdown>{evaluation.content}</ReactMarkdown>
        </div>
      </Paper>

      {/* Refresh Button */}
      <Group justify="center">
        <Button
          onClick={() => fetchEvaluation()}
          variant="filled"
          color="blue"
        >
          Refresh Evaluation
        </Button>
      </Group>
    </Stack>
  );
} 