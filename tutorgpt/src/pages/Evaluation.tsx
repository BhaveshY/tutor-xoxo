import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../lib/supabaseClient.ts';
import { 
  Paper, 
  Title, 
  Text, 
  Stack, 
  Group, 
  Badge, 
  Button, 
  Loader 
} from '@mantine/core';

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

export default function Evaluation() {
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
      <Stack align="center" justify="center" h={400}>
        <Loader size="lg" />
        <Text c="dimmed">Loading your evaluation...</Text>
      </Stack>
    );
  }

  if (error) {
    return (
      <Paper p="md" withBorder>
        <Stack>
          <Text c="red">{error}</Text>
          <Button onClick={fetchEvaluation} variant="light">
            Retry
          </Button>
        </Stack>
      </Paper>
    );
  }

  if (!evaluation) {
    return (
      <Paper p="md" withBorder>
        <Text>No evaluation data available.</Text>
      </Paper>
    );
  }

  return (
    <Stack gap="lg">
      {/* Quick Stats */}
      <Group grow>
        <Paper p="md" withBorder>
          <Stack gap="xs">
            <Text size="sm" c="dimmed">Learning Pace</Text>
            <Text size="lg" fw={500}>{evaluation.analysis.pace}</Text>
          </Stack>
        </Paper>
        <Paper p="md" withBorder>
          <Stack gap="xs">
            <Text size="sm" c="dimmed">Engagement</Text>
            <Text size="lg" fw={500}>{evaluation.analysis.engagement}</Text>
          </Stack>
        </Paper>
        <Paper p="md" withBorder>
          <Stack gap="xs">
            <Text size="sm" c="dimmed">Performance</Text>
            <Text size="lg" fw={500}>{evaluation.analysis.performance}</Text>
          </Stack>
        </Paper>
      </Group>

      {/* Detailed Evaluation */}
      <Paper p="lg" withBorder>
        <Stack gap="md">
          <Title order={3}>Detailed Evaluation</Title>
          <div className="prose max-w-none">
            <ReactMarkdown>{evaluation.content}</ReactMarkdown>
          </div>
        </Stack>
      </Paper>

      {/* Refresh Button */}
      <Group justify="center">
        <Button 
          onClick={fetchEvaluation}
          variant="light"
          size="md"
        >
          Refresh Evaluation
        </Button>
      </Group>
    </Stack>
  );
} 