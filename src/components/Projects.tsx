import React, { useState, useEffect } from 'react';
import { Box, Stack, Paper, Text, Badge, Group, Button, Select, Loader, Tabs, Progress, TextInput } from '@mantine/core';
import { IconBrain, IconClock, IconCode, IconBookmark, IconChecklist } from '@tabler/icons-react';
import { useAuth } from '../hooks/useAuth.ts';
import { databaseService, Project, ProjectSuggestion } from '../services/databaseService.ts';
import { llmService } from '../services/llmService.ts';
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [topic, setTopic] = useState('');
  const [preferredTech, setPreferredTech] = useState<string[]>([]);
  const [customTech, setCustomTech] = useState('');
  const { session } = useAuth();
  const userId = session?.user?.id;

  const commonTechnologies = [
    'React', 'Node.js', 'Python', 'JavaScript',
    'TypeScript', 'MongoDB', 'PostgreSQL', 'Express',
    'Next.js', 'Vue.js', 'Django', 'Flask',
    'GraphQL', 'REST API', 'Docker', 'AWS'
  ];

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
      console.error('Error loading project data:', error);
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

  const handleAddTech = (tech: string) => {
    if (!preferredTech.includes(tech)) {
      setPreferredTech([...preferredTech, tech]);
    }
  };

  const handleRemoveTech = (tech: string) => {
    setPreferredTech(preferredTech.filter(t => t !== tech));
  };

  const handleAddCustomTech = () => {
    if (customTech.trim() && !preferredTech.includes(customTech.trim())) {
      setPreferredTech([...preferredTech, customTech.trim()]);
      setCustomTech('');
    }
  };

  const handleGenerateProjects = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    try {
      const response = await llmService.generateProjects({
        topic,
        preferredDifficulty: selectedDifficulty as 'beginner' | 'intermediate' | 'advanced' | undefined,
        preferredTech: preferredTech.length > 0 ? preferredTech : undefined
      });
      
      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.content) {
        throw new Error('No suggestions returned');
      }

      // Add missing fields to the generated suggestions
      const newSuggestions: ProjectSuggestion[] = response.content.map(suggestion => ({
        ...suggestion,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      // Update suggestions with new ones
      setSuggestions(prevSuggestions => [...newSuggestions, ...prevSuggestions]);
      setTopic('');
      
      notifications.show({
        title: 'Success',
        message: 'New project suggestions generated successfully',
        color: 'green'
      });
    } catch (error) {
      console.error('Error generating projects:', error);
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to generate projects',
        color: 'red'
      });
    } finally {
      setIsGenerating(false);
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
            <Stack gap="md">
              <Paper p="md" withBorder>
                <form onSubmit={handleGenerateProjects}>
                  <Stack gap="md">
                    <TextInput
                      label="Project Topic"
                      value={topic}
                      onChange={(e) => setTopic(e.currentTarget.value)}
                      placeholder="Enter a topic to generate project suggestions..."
                      disabled={isGenerating}
                    />

                    <Select
                      label="Preferred Difficulty"
                      value={selectedDifficulty}
                      onChange={setSelectedDifficulty}
                      data={[
                        { value: 'beginner', label: 'Beginner' },
                        { value: 'intermediate', label: 'Intermediate' },
                        { value: 'advanced', label: 'Advanced' }
                      ]}
                      placeholder="Choose preferred difficulty (optional)"
                      clearable
                    />

                    <Box>
                      <Text size="sm" fw={500} mb="xs">Preferred Technologies</Text>
                      <Group gap="xs" mb="sm">
                        {preferredTech.map((tech: string) => (
                          <Badge
                            key={tech}
                            size="lg"
                            variant="light"
                            rightSection={
                              <Button
                                size="xs"
                                variant="transparent"
                                onClick={() => handleRemoveTech(tech)}
                                p={0}
                              >
                                ×
                              </Button>
                            }
                          >
                            {tech}
                          </Badge>
                        ))}
                      </Group>

                      <Group gap="xs" mb="sm">
                        {commonTechnologies
                          .filter(tech => !preferredTech.includes(tech))
                          .map((tech: string) => (
                            <Button
                              key={tech}
                              size="xs"
                              variant="light"
                              onClick={() => handleAddTech(tech)}
                            >
                              {tech}
                            </Button>
                          ))}
                      </Group>

                      <Group gap="xs">
                        <TextInput
                          placeholder="Add custom technology..."
                          value={customTech}
                          onChange={(e) => setCustomTech(e.currentTarget.value)}
                          style={{ flex: 1 }}
                        />
                        <Button
                          variant="light"
                          onClick={handleAddCustomTech}
                          disabled={!customTech.trim()}
                        >
                          Add
                        </Button>
                      </Group>
                    </Box>

                    <Button
                      type="submit"
                      loading={isGenerating}
                      disabled={!topic.trim()}
                      fullWidth
                    >
                      Generate Projects
                    </Button>
                  </Stack>
                </form>
              </Paper>

              <Group justify="space-between" align="center">
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
                  {filteredSuggestions.map((suggestion: ProjectSuggestion) => (
                    <Paper key={suggestion.id} p="md" withBorder>
                      <Stack gap="md">
                        <Group justify="space-between" align="flex-start">
                          <Stack gap="xs">
                            <Text size="lg" fw={700}>{suggestion.title}</Text>
                            <Group gap="xs">
                              <Badge
                                color={
                                  suggestion.difficulty === 'beginner' ? 'green' :
                                  suggestion.difficulty === 'intermediate' ? 'blue' : 'purple'
                                }
                              >
                                {suggestion.difficulty}
                              </Badge>
                              <Group gap={4}>
                                <IconClock size={16} />
                                <Text size="sm">{suggestion.estimated_hours} hours</Text>
                              </Group>
                            </Group>
                          </Stack>
                          <Button
                            variant="light"
                            onClick={() => handleStartProject(suggestion)}
                            disabled={!userId}
                          >
                            Start Project
                          </Button>
                        </Group>

                        <Text>{suggestion.description}</Text>

                        <Stack gap="xs">
                          <Text fw={500}>Technologies:</Text>
                          <Group gap="xs">
                            {suggestion.tech_stack.map((tech: string, index: number) => (
                              <Badge key={index} variant="dot">{tech}</Badge>
                            ))}
                          </Group>
                        </Stack>

                        <Stack gap="xs">
                          <Text fw={500}>Learning Outcomes:</Text>
                          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                            {suggestion.learning_outcomes.map((outcome: string, index: number) => (
                              <li key={index}>{outcome}</li>
                            ))}
                          </ul>
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Stack>
          </Box>
        </Tabs.Panel>

        <Tabs.Panel value="my-projects">
          <Box pt="md">
            <Stack gap="md">
              <Text size="xl" fw={700}>My Projects</Text>
              
              {!userId ? (
                <Paper p="xl" withBorder>
                  <Stack align="center" gap="md">
                    <IconBrain size={48} stroke={1.5} color="var(--mantine-color-blue-filled)" />
                    <Text size="lg" fw={500} ta="center">Sign in to start projects</Text>
                    <Text c="dimmed" ta="center">
                      Create an account or sign in to start tracking your projects.
                    </Text>
                  </Stack>
                </Paper>
              ) : userProjects.length === 0 ? (
                <Paper p="xl" withBorder>
                  <Stack align="center" gap="md">
                    <IconBrain size={48} stroke={1.5} color="var(--mantine-color-blue-filled)" />
                    <Text size="lg" fw={500} ta="center">No projects started</Text>
                    <Text c="dimmed" ta="center">
                      Browse project suggestions and start your first project!
                    </Text>
                  </Stack>
                </Paper>
              ) : (
                <Stack>
                  {userProjects.map((project: Project) => (
                    <Paper key={project.id} p="md" withBorder>
                      <Stack gap="md">
                        <Group justify="space-between" align="flex-start">
                          <Stack gap="xs">
                            <Text size="lg" fw={700}>{project.title}</Text>
                            <Group gap="xs">
                              <Badge
                                color={
                                  project.difficulty === 'beginner' ? 'green' :
                                  project.difficulty === 'intermediate' ? 'blue' : 'purple'
                                }
                              >
                                {project.difficulty}
                              </Badge>
                              <Group gap={4}>
                                <IconClock size={16} />
                                <Text size="sm">{project.estimated_hours} hours</Text>
                              </Group>
                              <Badge
                                color={
                                  project.status === 'completed' ? 'green' :
                                  project.status === 'in_progress' ? 'blue' : 'gray'
                                }
                              >
                                {project.status.replace('_', ' ')}
                              </Badge>
                            </Group>
                          </Stack>
                        </Group>

                        <Text>{project.description}</Text>

                        <Stack gap="xs">
                          <Text fw={500}>Technologies:</Text>
                          <Group gap="xs">
                            {project.tech_stack.map((tech: string, index: number) => (
                              <Badge key={index} variant="dot">{tech}</Badge>
                            ))}
                          </Group>
                        </Stack>

                        <Stack gap="xs">
                          <Text fw={500}>Learning Outcomes:</Text>
                          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                            {project.learning_outcomes.map((outcome: string, index: number) => (
                              <li key={index}>{outcome}</li>
                            ))}
                          </ul>
                        </Stack>

                        <Stack gap="xs">
                          <Group justify="space-between">
                            <Text fw={500}>Progress:</Text>
                            <Text size="sm">{project.progress}%</Text>
                          </Group>
                          <Progress
                            value={project.progress}
                            color={
                              project.progress === 100 ? 'green' :
                              project.progress > 0 ? 'blue' : 'gray'
                            }
                          />
                          <Group justify="space-between">
                            <Button
                              variant="light"
                              color="red"
                              onClick={() => handleUpdateProgress(project, 0)}
                              disabled={project.progress === 0}
                            >
                              Reset Progress
                            </Button>
                            <Group gap="xs">
                              <Button
                                variant="light"
                                onClick={() => handleUpdateProgress(project, Math.max(0, project.progress - 10))}
                                disabled={project.progress === 0}
                              >
                                -10%
                              </Button>
                              <Button
                                variant="light"
                                onClick={() => handleUpdateProgress(project, Math.min(100, project.progress + 10))}
                                disabled={project.progress === 100}
                              >
                                +10%
                              </Button>
                              <Button
                                variant="light"
                                color="green"
                                onClick={() => handleUpdateProgress(project, 100)}
                                disabled={project.progress === 100}
                              >
                                Complete
                              </Button>
                            </Group>
                          </Group>
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Stack>
          </Box>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}; 