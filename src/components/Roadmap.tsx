import React, { useEffect, useState } from 'react';
import { llmService } from '../services/llmService.ts';
import { databaseService, LearningRoadmap } from '../services/databaseService.ts';
import { useAuth } from '../hooks/useAuth.ts';
import { ErrorMessage } from './ErrorMessage.tsx';
import { Projects } from './Projects.tsx';
import ReactMarkdown from 'react-markdown';
import { LLMProvider } from "../services/llmService.ts";
import { Paper, Text, TextInput, Button, Stack, Group, Loader, Box } from '@mantine/core';

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
      <Box py="xl" ta="center">
        <Loader size="md" />
        <Text mt="md" c="dimmed">Loading roadmaps...</Text>
      </Box>
    );
  }

  return (
    <Stack className={className}>
      {error && <ErrorMessage message={error} onRetry={loadRoadmaps} />}
      
      <Paper p="md" withBorder>
        <form onSubmit={handleGenerateRoadmap}>
          <Stack gap="md">
            <TextInput
              label="Topic"
              value={topic}
              onChange={(e) => setTopic(e.currentTarget.value)}
              placeholder="Enter a topic to generate a learning roadmap..."
              disabled={isLoading}
            />
            <Button
              type="submit"
              loading={isLoading}
              disabled={!topic.trim()}
              fullWidth
            >
              Generate Roadmap
            </Button>
          </Stack>
        </form>
      </Paper>

      {roadmaps.length > 0 && (
        <Stack gap="md">
          {roadmaps.map((roadmap) => (
            <Paper key={roadmap.id} p="md" withBorder>
              <Stack gap="md">
                <Text size="lg" fw={700}>{roadmap.title}</Text>
                <ReactMarkdown className="prose">
                  {roadmap.content}
                </ReactMarkdown>
                <Projects provider={provider} roadmapId={roadmap.id} />
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}; 