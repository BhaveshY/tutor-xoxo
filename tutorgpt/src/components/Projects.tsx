import React, { useState, useEffect } from 'react';
import { Box, Stack, Paper, Text, Badge, Group, Button, Select, Loader, Tabs, Progress, TextInput, NumberInput } from '@mantine/core';
import { IconBrain, IconClock, IconCode, IconBookmark, IconChecklist, IconPlus } from '@tabler/icons-react';
import { useAuth } from '../hooks/useAuth.ts';
import { databaseService, Project, ProjectSuggestion } from '../services/databaseService.ts';
import { ErrorMessage } from './ErrorMessage.tsx';
import { notifications } from '@mantine/notifications';
import { llmService } from '../services/llmService.ts';

interface ProjectsProps {
  className?: string;
}

interface GenerationParams {
  topic: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  techStack: string;
}

export const Projects: React.FC<ProjectsProps> = ({ className }) => {
  const [suggestions, setSuggestions] = useState<ProjectSuggestion[]>([]);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [generationParams, setGenerationParams] = useState<GenerationParams>({
    topic: '',
    difficulty: 'intermediate',
    techStack: ''
  });
  const { session } = useAuth();
  const userId = session?.user?.id;

  console.log('Projects component state:', {
    isLoading,
    hasError: !!error,
    errorMessage: error,
    suggestionsCount: suggestions.length,
    userProjectsCount: userProjects.length,
    selectedDifficulty,
    userId,
    hasSession: !!session,
    timestamp: new Date().toISOString()
  });

  useEffect(() => {
    console.log('Projects useEffect triggered:', {
      userId,
      timestamp: new Date().toISOString()
    });
    loadData();
  }, [userId]);

  const loadData = async () => {
    console.log('Projects loadData started:', {
      userId,
      timestamp: new Date().toISOString()
    });
    setIsLoading(true);
    setError(null);
    try {
      console.log('Fetching project data...');
      const [suggestionsData, projectsData] = await Promise.all([
        databaseService.getProjectSuggestions(),
        userId ? databaseService.getProjects(userId) : Promise.resolve([])
      ]);
      console.log('Raw project data:', {
        suggestionsData,
        projectsData,
        timestamp: new Date().toISOString()
      });
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

  const handleGenerateProject = async () => {
    if (!generationParams.topic.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a topic for the project',
        color: 'red'
      });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await llmService.generateProjects({
        topic: generationParams.topic,
        preferredDifficulty: generationParams.difficulty,
        preferredTech: generationParams.techStack ? generationParams.techStack.split(',').map(tech => tech.trim()).filter(tech => tech.length > 0) : undefined,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      // Reload suggestions to get the newly generated ones
      await loadData();
      
      setShowGenerateForm(false);
      setGenerationParams({
        topic: '',
        difficulty: 'intermediate',
        techStack: ''
      });

      notifications.show({
        title: 'Success',
        message: 'New project suggestion generated successfully',
        color: 'green'
      });
    } catch (error) {
      console.error('Error generating project:', error);
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to generate project suggestion',
        color: 'red'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredSuggestions = selectedDifficulty
    ? suggestions.filter(project => project.difficulty === selectedDifficulty)
    : suggestions;

  console.log('Filtered suggestions:', {
    originalCount: suggestions.length,
    filteredCount: filteredSuggestions.length,
    selectedDifficulty,
    timestamp: new Date().toISOString()
  });

  if (isLoading) {
    console.log('Rendering loading state');
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

  // Add debug logging before return
  console.log('Projects render output:', {
    isShowingLoader: isLoading,
    hasError: !!error,
    hasSuggestions: filteredSuggestions.length > 0,
    hasUserProjects: userProjects.length > 0,
    suggestionsData: filteredSuggestions,
    userProjectsData: userProjects,
    timestamp: new Date().toISOString()
  });

  return (
    <Stack className={className}>
      {error && <ErrorMessage message={error} onRetry={loadData} />}
      
      <Tabs defaultValue="suggestions">
        <Tabs.List mb="md">
          <Tabs.Tab value="suggestions" leftSection={<IconBookmark size={20} />}>
            Project Suggestions
          </Tabs.Tab>
          <Tabs.Tab value="my-projects" leftSection={<IconChecklist size={20} />}>
            My Projects
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="suggestions">
          <Box>
            <Group justify="space-between" align="center" mb="md">
              <Text size="xl" fw={700}>Project Suggestions</Text>
              <Group>
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
                <Button
                  variant="light"
                  onClick={() => setShowGenerateForm(!showGenerateForm)}
                  leftSection={<IconPlus size={20} />}
                >
                  Generate New Project
                </Button>
              </Group>
            </Group>

            {showGenerateForm && (
              <Paper p="md" withBorder mb="md">
                <Stack gap="md">
                  <Text fw={500}>Generate New Project Suggestion</Text>
                  
                  <TextInput
                    label="Topic"
                    placeholder="Enter the main topic or goal of the project"
                    value={generationParams.topic}
                    onChange={(e) => setGenerationParams(prev => ({
                      ...prev,
                      topic: e.currentTarget.value
                    }))}
                    required
                  />
                  
                  <Select
                    label="Difficulty"
                    value={generationParams.difficulty}
                    onChange={(value) => setGenerationParams(prev => ({
                      ...prev,
                      difficulty: value as 'beginner' | 'intermediate' | 'advanced' || 'intermediate'
                    }))}
                    data={[
                      { value: 'beginner', label: 'Beginner' },
                      { value: 'intermediate', label: 'Intermediate' },
                      { value: 'advanced', label: 'Advanced' }
                    ]}
                  />
                  
                  <TextInput
                    label="Tech Stack (comma-separated)"
                    placeholder="React, Node.js, TypeScript"
                    value={generationParams.techStack}
                    onChange={(e) => setGenerationParams(prev => ({
                      ...prev,
                      techStack: e.currentTarget.value
                    }))}
                  />
                  
                  <Group justify="flex-end">
                    <Button
                      variant="light"
                      color="gray"
                      onClick={() => setShowGenerateForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleGenerateProject}
                      loading={isGenerating}
                    >
                      Generate Project
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            )}

            <Stack gap="md">
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
                filteredSuggestions.map((suggestion) => (
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
                ))
              )}
            </Stack>
          </Box>
        </Tabs.Panel>

        <Tabs.Panel value="my-projects">
          <Box>
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
              <Stack gap="md">
                {userProjects.map(renderProjectCard)}
              </Stack>
            )}
          </Box>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}; 
