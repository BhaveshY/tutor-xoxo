import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth.ts';
import { ErrorMessage } from './ErrorMessage.tsx';
import { type LLMProvider } from '../services/llmService.ts';
import { supabase } from '../lib/supabaseClient.ts';
import ReactMarkdown from 'react-markdown';
import { Paper, Text, TextInput, Button, Stack, Group, Badge, Box } from '@mantine/core';

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
  provider: LLMProvider;
  roadmapId?: string;
}

export const Projects: React.FC<ProjectsProps> = ({ className, provider, roadmapId }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          roadmapId: roadmapId,
          topic: topic.trim(),
          model: provider
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate projects');
      }

      const { content } = await response.json();
      
      // Save projects to database
      const { error: saveError } = await supabase
        .from('projects')
        .insert(
          content.map((project: any) => ({
            user_id: userId,
            roadmap_id: roadmapId,
            title: project.title,
            description: project.description,
            implementation_plan: project.requirements,
            difficulty: project.difficulty || 'Intermediate',
            status: 'Not Started'
          }))
        );

      if (saveError) throw saveError;
      
      await loadProjects();
      setTopic('');
    } catch (error) {
      console.error('Error generating projects:', error);
      setError('Failed to generate projects. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Stack className={className}>
      <Paper p="md" withBorder>
        <form onSubmit={handleGenerateProjects}>
          {!roadmapId && (
            <TextInput
              value={topic}
              onChange={(e) => setTopic(e.currentTarget.value)}
              placeholder="Enter a topic for project suggestions..."
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

      {error && <ErrorMessage message={error} />}

      {projects.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          No projects yet. Generate your first project!
        </Text>
      ) : (
        <Stack>
          {projects.map((project) => (
            <Paper key={project.id} p="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Text size="xl" fw={700}>{project.title}</Text>
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
              <Box mb="md">
                <Text fw={500} mb="xs">Description:</Text>
                <Text>{project.description}</Text>
              </Box>
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