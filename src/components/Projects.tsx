import React, { useEffect, useState } from 'react';
import { llmService, LLMModel } from '../services/llmService.ts';
import { databaseService, Project } from '../services/databaseService.ts';
import { useAuth } from '../hooks/useAuth.ts';
import { ErrorMessage } from './ErrorMessage.tsx';
import { Paper, Text, Button, Stack, Group, Loader, Box } from '@mantine/core';

interface ProjectsProps {
  roadmapId: string;
  model: LLMModel;
}

export const Projects: React.FC<ProjectsProps> = ({ roadmapId, model }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();
  const userId = session?.user?.id;

  useEffect(() => {
    if (userId && roadmapId) {
      loadProjects();
    }
  }, [userId, roadmapId]);

  const loadProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const projectsData = await databaseService.getProjects(roadmapId);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading projects:', error);
      setError('Failed to load projects. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateProjects = async () => {
    if (!userId || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    try {
      const response = await llmService.generateProjects(userId, roadmapId, model);
      if (response.error) {
        throw new Error(response.error);
      }
      await loadProjects();
    } catch (error) {
      console.error('Error generating projects:', error);
      setError('Failed to generate projects. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <Box py="xl" ta="center">
        <Loader size="md" />
        <Text mt="md" c="dimmed">Loading projects...</Text>
      </Box>
    );
  }

  return (
    <Stack>
      {error && <ErrorMessage message={error} onRetry={loadProjects} />}
      
      <Group justify="space-between" align="center">
        <Text size="lg" fw={700}>Practice Projects</Text>
        <Button
          onClick={handleGenerateProjects}
          loading={isGenerating}
          variant="light"
        >
          Generate Projects
        </Button>
      </Group>

      {projects.length > 0 ? (
        <Stack gap="md">
          {projects.map((project) => (
            <Paper key={project.id} p="md" withBorder>
              <Stack gap="sm">
                <Text fw={600}>{project.title}</Text>
                <Text>{project.description}</Text>
                {project.requirements && (
                  <>
                    <Text fw={600}>Requirements:</Text>
                    <Text>{project.requirements}</Text>
                  </>
                )}
              </Stack>
            </Paper>
          ))}
        </Stack>
      ) : (
        <Text c="dimmed" ta="center">No projects generated yet. Click the button above to generate some practice projects.</Text>
      )}
    </Stack>
  );
}; 