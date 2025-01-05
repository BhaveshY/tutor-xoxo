import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth.ts';
import { ErrorMessage } from './ErrorMessage.tsx';
import { supabase } from '../lib/supabaseClient.ts';
import ReactMarkdown from 'react-markdown';
import {
  Paper,
  Text,
  TextInput,
  Button,
  Stack,
  Group,
  Badge,
  Box,
  Title,
  Loader,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';

interface Project {
  id: string;
  title: string;
  description: string;
  implementation_plan: string;
  difficulty: string;
  status: string;
}

interface ProjectsProps {
  className?: string;
  roadmapId?: string;
}

export const Projects: React.FC<ProjectsProps> = ({ className, roadmapId }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();
  const userId = session?.user?.id;

  useEffect(() => {
    if (userId) {
      loadProjects();
    }
  }, [userId]);

  const loadProjects = async () => {
    if (!userId) return;
    
    setIsLoadingProjects(true);
    setError(null);
    try {
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(projectsData || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      setError('Failed to load projects. Please try again.');
      notifications.show({
        title: 'Error',
        message: 'Failed to load projects',
        color: 'red',
      });
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const handleGenerateProjects = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || isLoading) return;
    if (!roadmapId && !topic.trim()) {
      setError('Please enter a topic or select a roadmap');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          roadmapId,
          topic: topic.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate projects');
      }

      const data = await response.json();
      
      // Save projects to database
      const { error: saveError } = await supabase
        .from('projects')
        .insert(
          data.projects.map((project: any) => ({
            user_id: userId,
            roadmap_id: roadmapId,
            ...project,
          }))
        );

      if (saveError) throw saveError;
      
      await loadProjects();
      setTopic('');
      notifications.show({
        title: 'Success',
        message: 'Projects generated successfully',
        color: 'green',
      });
    } catch (error) {
      console.error('Error generating projects:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate projects';
      setError(errorMessage);
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Stack className={className} gap="xl">
      <Paper shadow="xs" p="md" withBorder>
        <form onSubmit={handleGenerateProjects}>
          {!roadmapId && (
            <TextInput
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter a topic for project suggestions..."
              label="Topic"
              disabled={isLoading}
              mb="md"
            />
          )}
          <Button
            type="submit"
            loading={isLoading}
            disabled={!roadmapId && !topic.trim()}
            fullWidth
          >
            Generate Projects
          </Button>
        </form>
      </Paper>

      {error && <ErrorMessage message={error} onRetry={loadProjects} />}

      {isLoadingProjects ? (
        <Box py="xl" ta="center">
          <Loader size="md" />
          <Text mt="md" c="dimmed">Loading projects...</Text>
        </Box>
      ) : projects.length === 0 ? (
        <Box py="xl" ta="center">
          <Text c="dimmed">No projects yet. Generate your first project!</Text>
        </Box>
      ) : (
        <Stack gap="md">
          {projects.map((project) => (
            <Paper key={project.id} shadow="xs" p="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Title order={4}>{project.title}</Title>
                <Badge
                  color={
                    project.difficulty === 'Beginner' ? 'green' :
                    project.difficulty === 'Intermediate' ? 'yellow' :
                    'red'
                  }
                >
                  {project.difficulty}
                </Badge>
              </Group>
              <Text mb="md" c="dimmed">
                {project.description}
              </Text>
              <Box>
                <Text fw={500} mb="xs">Implementation Plan:</Text>
                <Paper p="sm" bg="gray.0">
                  <ReactMarkdown className="prose">
                    {project.implementation_plan}
                  </ReactMarkdown>
                </Paper>
              </Box>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}; 