import React, { useEffect, useState } from 'react';
import { llmService } from '../services/llmService.ts';
import { databaseService, LearningRoadmap } from '../services/databaseService.ts';
import { useAuth } from '../hooks/useAuth.ts';
import { ErrorMessage } from './ErrorMessage.tsx';
import ReactMarkdown from 'react-markdown';
import { LLMProvider } from "./LLMSelector.tsx";

interface RoadmapProps {
  className?: string;
  provider: LLMProvider;
}

export const Roadmap: React.FC<RoadmapProps> = ({ className, provider }) => {
  const [topic, setTopic] = useState('');
  const [roadmaps, setRoadmaps] = useState<LearningRoadmap[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRoadmaps, setIsLoadingRoadmaps] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();
  const userId = session?.user?.id;

  useEffect(() => {
    if (userId) {
      loadRoadmaps();
    }
  }, [userId]);

  const loadRoadmaps = async () => {
    setIsLoadingRoadmaps(true);
    setError(null);
    try {
      const roadmapsData = await databaseService.getRoadmaps(userId!);
      setRoadmaps(roadmapsData);
    } catch (error) {
      console.error('Error loading roadmaps:', error);
      setError('Failed to load roadmaps. Please try again.');
    } finally {
      setIsLoadingRoadmaps(false);
    }
  };

  const handleGenerateRoadmap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !userId || isLoading) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await llmService.generateRoadmap(userId, topic);
      if (response.error) {
        throw new Error(response.error);
      }
      await loadRoadmaps();
      setTopic('');
    } catch (error) {
      console.error('Error generating roadmap:', error);
      setError('Failed to generate roadmap. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingRoadmaps) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {error && <ErrorMessage message={error} onRetry={loadRoadmaps} />}
      
      <form onSubmit={handleGenerateRoadmap} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Topic</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter a topic to generate a learning roadmap..."
            className="mt-1 block w-full p-2 border rounded-lg"
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !topic.trim()}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 hover:bg-blue-600 transition-colors"
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              <span>Generating...</span>
            </div>
          ) : (
            'Generate Roadmap'
          )}
        </button>
      </form>

      {roadmaps.length > 0 ? (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Your Learning Roadmaps</h2>
          <div className="space-y-4">
            {roadmaps.map((roadmap) => (
              <div key={roadmap.id} className="p-4 border rounded-lg hover:border-blue-200 transition-colors">
                <h3 className="font-medium text-lg mb-2">{roadmap.title}</h3>
                <div className="prose max-w-none">
                  <ReactMarkdown>{roadmap.content}</ReactMarkdown>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Created: {new Date(roadmap.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500 mt-8">
          No roadmaps yet. Generate your first learning roadmap!
        </div>
      )}
    </div>
  );
}; 