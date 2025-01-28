import React, { useState, useEffect } from 'react';
import { Box, Stack, Paper, Text, Badge, Group, Button, Select, Loader, Tabs, Progress } from '@mantine/core';
import { IconBrain, IconClock, IconCode, IconBookmark, IconChecklist } from '@tabler/icons-react';
import { useAuth } from '../hooks/useAuth.ts';
import { databaseService, Project, ProjectSuggestion } from '../services/databaseService.ts';
import { ErrorMessage } from './ErrorMessage.tsx';
import { notifications } from '@mantine/notifications';

interface ProjectsProps {
  className?: string;
}

export const Projects: React.FC<ProjectsProps> = ({ className }) => {
  const [suggestions, setSuggestions] = useState<ProjectSuggestion[]>([]);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const { session } = useAuth();
  const userId = session?.user?.id;

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [suggestionsData, projectsData] = await Promise.all([
        databaseService.getProjectSuggestions(),
        userId ? databaseService.getProjects(userId) : Promise.resolve([])
      ]);
      setSuggestions(suggestionsData);
      setUserProjects(projectsData);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load projects. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartProject = async (suggestion: ProjectSuggestion) => {
    if (!userId) {
      notifications.show({
        title: 'Error',
        message: 'Please sign in to start a project',
        color: 'red'
      });
      return;
    }

    try {
      const newProject: Omit<Project, 'id' | 'created_at' | 'updated_at'> = {
        user_id: userId,
        suggestion_id: suggestion.id,
        title: suggestion.title,
        description: suggestion.description,
        difficulty: suggestion.difficulty,
        estimated_hours: suggestion.estimated_hours,
        tech_stack: suggestion.tech_stack,
        learning_outcomes: suggestion.learning_outcomes,
        status: 'not_started',
        progress: 0
      };

      await databaseService.createProject(newProject);
      await loadData();
      
      notifications.show({
        title: 'Success',
        message: 'Project started successfully',
        color: 'green'
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to start project',
        color: 'red'
      });
    }
  };

  const handleUpdateProgress = async (project: Project, newProgress: number) => {
    try {
      await databaseService.updateProject(project.id, {
        progress: newProgress,
        status: newProgress === 100 ? 'completed' : newProgress === 0 ? 'not_started' : 'in_progress'
      });
      await loadData();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to update progress',
        color: 'red'
      });
    }
  };

  const filteredSuggestions = selectedDifficulty
    ? suggestions.filter(project => project.difficulty === selectedDifficulty)
    : suggestions;

  if (isLoading) {
    return (
      <Box py="xl" ta="center">
        <Loader size="md" />
        <Text mt="md" c="dimmed">Loading projects...</Text>
      </Box>
    );
  }

  const renderProjectCard = (project: Project) => (
    <Paper key={project.id} p="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between" wrap="nowrap">
          <Text size="lg" fw={700}>{project.title}</Text>
          <Group gap="sm">
            <Badge size="lg" variant="light" color={
              project.status === 'completed' ? 'green' :
              project.status === 'in_progress' ? 'blue' : 'gray'
            }>
              {project.status.replace('_', ' ').charAt(0).toUpperCase() + project.status.slice(1).replace('_', ' ')}
            </Badge>
            <Badge size="lg" variant="light" color={
              project.difficulty === 'beginner' ? 'green' :
              project.difficulty === 'intermediate' ? 'blue' : 'purple'
            }>
              {project.difficulty.charAt(0).toUpperCase() + project.difficulty.slice(1)}
            </Badge>
          </Group>
        </Group>
        
        <Text>{project.description}</Text>
        
        <Group>
          <Group gap="xs">
            <IconClock size={20} />
            <Text size="sm">{project.estimated_hours} hours</Text>
          </Group>
          <Group gap="xs">
            <IconCode size={20} />
            <Group gap={8}>
              {project.tech_stack.map((tech, index) => (
                <Badge key={index} size="sm" variant="dot">{tech}</Badge>
              ))}
            </Group>
          </Group>
        </Group>

        <Box>
          <Text fw={500} mb="xs">Learning Outcomes:</Text>
          <Group gap={8}>
            {project.learning_outcomes.map((outcome, index) => (
              <Badge key={index} size="sm" variant="outline">{outcome}</Badge>
            ))}
          </Group>
        </Box>

        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" fw={500}>Progress: {project.progress}%</Text>
            <Group gap="xs">
              <Button 
                variant="subtle" 
                size="xs"
                onClick={() => handleUpdateProgress(project, Math.max(0, project.progress - 10))}
                disabled={project.progress === 0}
              >
                -10%
              </Button>
              <Button 
                variant="subtle" 
                size="xs"
                onClick={() => handleUpdateProgress(project, Math.min(100, project.progress + 10))}
                disabled={project.progress === 100}
              >
                +10%
              </Button>
            </Group>
          </Group>
          <Progress value={project.progress} color={
            project.progress === 100 ? 'green' :
            project.progress >= 50 ? 'blue' : 'gray'
          } />
        </Stack>
      </Stack>
    </Paper>
  );

  return (
    <Stack className={className}>
      {error && <ErrorMessage message={error} onRetry={loadData} />}
      
      <Tabs defaultValue="suggestions">
        <Tabs.List>
          <Tabs.Tab value="suggestions" leftSection={<IconBookmark size={20} />}>
            Project Suggestions
          </Tabs.Tab>
          <Tabs.Tab value="my-projects" leftSection={<IconChecklist size={20} />}>
            My Projects
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="suggestions">
          <Box pt="md">
            <Group justify="space-between" align="center" mb="md">
              <Text size="xl" fw={700}>Project Suggestions</Text>
              <Select
                value={selectedDifficulty}
                onChange={setSelectedDifficulty}
                data={[
                  { value: 'beginner', label: 'Beginner' },
                  { value: 'intermediate', label: 'Intermediate' },
                  { value: 'advanced', label: 'Advanced' }
                ]}
                placeholder="Filter by difficulty"
                clearable
                style={{ width: 200 }}
              />
            </Group>

            {filteredSuggestions.length === 0 ? (
              <Paper p="xl" withBorder>
                <Stack align="center" gap="md">
                  <IconBrain size={48} stroke={1.5} color="var(--mantine-color-blue-filled)" />
                  <Text size="lg" fw={500} ta="center">No projects available</Text>
                  <Text c="dimmed" ta="center">
                    {selectedDifficulty
                      ? `No ${selectedDifficulty} projects found. Try a different difficulty level.`
                      : 'No project suggestions available at the moment.'}
                  </Text>
                </Stack>
              </Paper>
            ) : (
              <Stack>
                {filteredSuggestions.map((suggestion) => (
                  <Paper key={suggestion.id} p="md" withBorder>
                    <Stack gap="md">
                      <Group justify="space-between" wrap="nowrap">
                        <Text size="lg" fw={700}>{suggestion.title}</Text>
                        <Badge size="lg" variant="light" color={
                          suggestion.difficulty === 'beginner' ? 'green' :
                          suggestion.difficulty === 'intermediate' ? 'blue' : 'purple'
                        }>
                          {suggestion.difficulty.charAt(0).toUpperCase() + suggestion.difficulty.slice(1)}
                        </Badge>
                      </Group>
                      
                      <Text>{suggestion.description}</Text>
                      
                      <Group>
                        <Group gap="xs">
                          <IconClock size={20} />
                          <Text size="sm">{suggestion.estimated_hours} hours</Text>
                        </Group>
                        <Group gap="xs">
                          <IconCode size={20} />
                          <Group gap={8}>
                            {suggestion.tech_stack.map((tech, index) => (
                              <Badge key={index} size="sm" variant="dot">{tech}</Badge>
                            ))}
                          </Group>
                        </Group>
                      </Group>

                      <Box>
                        <Text fw={500} mb="xs">Learning Outcomes:</Text>
                        <Group gap={8}>
                          {suggestion.learning_outcomes.map((outcome, index) => (
                            <Badge key={index} size="sm" variant="outline">{outcome}</Badge>
                          ))}
                        </Group>
                      </Box>

                      <Group justify="flex-end">
                        <Button 
                          variant="light"
                          onClick={() => handleStartProject(suggestion)}
                          disabled={userProjects.some(p => p.suggestion_id === suggestion.id)}
                        >
                          {userProjects.some(p => p.suggestion_id === suggestion.id) 
                            ? 'Already Started' 
                            : 'Start Project'}
                        </Button>
                      </Group>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>
        </Tabs.Panel>

        <Tabs.Panel value="my-projects">
          <Box pt="md">
            <Text size="xl" fw={700} mb="md">My Projects</Text>
            {userProjects.length === 0 ? (
              <Paper p="xl" withBorder>
                <Stack align="center" gap="md">
                  <IconChecklist size={48} stroke={1.5} color="var(--mantine-color-blue-filled)" />
                  <Text size="lg" fw={500} ta="center">No projects started</Text>
                  <Text c="dimmed" ta="center">
                    Start a project from the suggestions tab to begin your learning journey.
                  </Text>
                </Stack>
              </Paper>
            ) : (
              <Stack>
                {userProjects.map(renderProjectCard)}
              </Stack>
            )}
          </Box>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}; 
