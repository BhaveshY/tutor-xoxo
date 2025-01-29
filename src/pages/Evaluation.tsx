import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../lib/supabaseClient';
import { Spinner } from '../components/Spinner';
import { Alert } from '../components/Alert';

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
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Learning Pace</h3>
          <p className="mt-2 text-lg font-semibold">{evaluation.analysis.pace}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Engagement</h3>
          <p className="mt-2 text-lg font-semibold">{evaluation.analysis.engagement}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Performance</h3>
          <p className="mt-2 text-lg font-semibold">{evaluation.analysis.performance}</p>
        </div>
      </div>

      {/* Detailed Evaluation */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="prose max-w-none">
          <ReactMarkdown>{evaluation.content}</ReactMarkdown>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-center mt-6">
        <button
          onClick={() => fetchEvaluation()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Refresh Evaluation
        </button>
      </div>
    </div>
  );
} 
