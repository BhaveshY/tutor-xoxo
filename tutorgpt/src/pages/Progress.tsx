import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore.ts';
import {
  Paper,
  Title,
  Text,
  Progress as MantineProgress,
  Stack,
  Group,
  ThemeIcon,
  Checkbox,
  Badge,
  Tooltip,
  Box,
  Alert,
  RingProgress,
  Card,
  Collapse,
  ActionIcon,
  Divider,
} from '@mantine/core';
import { 
  IconBook, 
  IconBrain, 
  IconAlertCircle, 
  IconChevronDown, 
  IconChevronUp,
  IconClockHour4,
  IconTrendingUp,
  IconBulb,
  IconStars,
} from '@tabler/icons-react';
import { RoadmapTopic, RoadmapSubtopic, Roadmap } from '../types/roadmap.ts';
import { evolutionaryLearning } from '../lib/evolutionaryLearning.ts';

export const parseRoadmapContent = (content: string): RoadmapTopic[] => {
  const lines = content.split('\n');
  const topics: RoadmapTopic[] = [];
  let currentTopic: RoadmapTopic | null = null;

  lines.forEach((line) => {
    const trimmedLine = line.trim();
    
    // Match main topic (starts with ## followed by number or text)
    if (trimmedLine.match(/^##\s+(\d+\.\s+)?[^#]/)) {
      if (currentTopic) {
        topics.push(currentTopic);
      }
      const title = trimmedLine.replace(/^##\s+(\d+\.\s+)?/, '');
      currentTopic = {
        id: Math.random().toString(),
        title,
        subtopics: [],
        completed: false,
      };
    }
    // Match actual learning tasks (starts with - or * but not subtopic headers)
    else if (trimmedLine.match(/^[-*]\s+/) && !trimmedLine.includes('**Subtopic')) {
      if (!currentTopic) return;
      
      // Clean up the task title
      const title = trimmedLine
        .replace(/^[-*]\s+/, '') // Remove bullet point
        .replace(/\[[ x]\]\s*/, ''); // Remove checkbox if present
      
      // Check if the task was marked as completed
      const completed = trimmedLine.includes('[x]');
      
      currentTopic.subtopics.push({
        id: Math.random().toString(),
        title,
        completed,
      });
    }
  });

  if (currentTopic) {
    topics.push(currentTopic);
  }

  // Update topic completion status based on tasks
  topics.forEach(topic => {
    topic.completed = topic.subtopics.length > 0 && topic.subtopics.every(st => st.completed);
  });

  return topics;
};

export const calculateProgress = (topics: RoadmapTopic[]): number => {
  if (!topics || topics.length === 0) return 0;

  let totalSubtopics = 0;
  let completedSubtopics = 0;

  topics.forEach(topic => {
    totalSubtopics += topic.subtopics.length;
    completedSubtopics += topic.subtopics.filter(st => st.completed).length;
  });

  return totalSubtopics === 0 ? 0 : Math.round((completedSubtopics / totalSubtopics) * 100);
};

const Progress = () => {
  const { roadmaps, updateRoadmapProgress } = useStore();
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const [startTime, setStartTime] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      console.log('Roadmaps changed:', roadmaps);
      
      // Initialize evolutionary learning with existing progress
      if (roadmaps) {
        roadmaps.forEach(roadmap => {
          roadmap.topics.forEach(topic => {
            topic.subtopics.forEach(subtopic => {
              if (subtopic.completed) {
                // Add completed topics with a default time of 10 minutes
                evolutionaryLearning.updateLearningPattern(subtopic.id, 600, true);
              }
            });
          });
        });
      }
    } catch (err) {
      console.error('Error initializing progress:', err);
      setError('There was an error loading your progress. Your data is safe, but some features might be limited.');
    }
  }, [roadmaps]);

  const toggleTopic = (roadmapId: string, topicId: string) => {
    setExpandedTopics(prev => ({
      ...prev,
      [`${roadmapId}-${topicId}`]: !prev[`${roadmapId}-${topicId}`]
    }));
  };

  const handleSubtopicChange = (roadmapId: string, topicId: string, subtopicId: string, completed: boolean) => {
    try {
      // Start timing when unchecking (starting to work on it)
      if (!completed && !startTime[`${topicId}-${subtopicId}`]) {
        console.log('Starting timer for:', subtopicId);
        setStartTime(prev => ({
          ...prev,
          [`${topicId}-${subtopicId}`]: Date.now()
        }));
      }

      // Stop timing and update learning when checking (completing it)
      if (completed && startTime[`${topicId}-${subtopicId}`]) {
        const timeSpent = (Date.now() - startTime[`${topicId}-${subtopicId}`]) / 1000; // Convert to seconds
        console.log('Completing topic:', subtopicId, 'Time spent:', timeSpent);
        evolutionaryLearning.updateLearningPattern(subtopicId, timeSpent, true);
        
        setStartTime(prev => {
          const newStartTime = { ...prev };
          delete newStartTime[`${topicId}-${subtopicId}`];
          return newStartTime;
        });
      }

      updateRoadmapProgress(roadmapId, topicId, subtopicId, completed);
    } catch (err) {
      console.error('Error updating subtopic:', err);
      setError('There was an error updating your progress. Please try again.');
    }
  };

  const renderMetricsCard = (topic: RoadmapTopic) => {
    const completedCount = topic.subtopics.filter(st => st.completed).length;
    const totalCount = topic.subtopics.length;
    const progress = (completedCount / totalCount) * 100;

    return (
      <Card withBorder shadow="sm" p="md" radius="md">
        <Group justify="space-between" mb="xs">
          <Text fw={500} size="lg">{topic.title}</Text>
          <Badge size="lg" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
            {Math.round(progress)}% Complete
          </Badge>
        </Group>
        <Group gap="xl" grow>
          <RingProgress
            size={90}
            roundCaps
            thickness={8}
            sections={[{ value: progress, color: 'blue' }]}
            label={
              <Text size="xs" ta="center" fw={700}>
                {completedCount}/{totalCount}
              </Text>
            }
          />
          <Stack gap={4}>
            <Text size="sm" c="dimmed">Subtopics Progress</Text>
            <MantineProgress
              value={progress}
              size="lg"
              radius="xl"
              color={progress === 100 ? 'green' : 'blue'}
            />
          </Stack>
        </Group>
      </Card>
    );
  };

  const renderLearningInsights = (topic: RoadmapTopic) => {
    const patterns = topic.subtopics.map(subtopic => {
      const recommendations = evolutionaryLearning.getRecommendations(subtopic.id);
      return { subtopic, recommendations };
    }).filter(({ recommendations }) => recommendations?.strategy !== null);

    if (patterns.length === 0) return null;

    return (
      <Stack gap="md" mt="md">
        <Group justify="space-between">
          <Group gap={8}>
            <ThemeIcon size="md" variant="light" color="blue">
              <IconBrain size={18} />
            </ThemeIcon>
            <Text fw={500}>Learning Insights</Text>
          </Group>
          <Badge variant="dot" color="blue">AI-Powered</Badge>
        </Group>
        
        <Stack gap="sm">
          {patterns.map(({ subtopic, recommendations }) => (
            recommendations?.strategy && (
              <Card key={subtopic.id} withBorder p="sm" radius="md">
                <Group justify="space-between" mb="xs">
                  <Group gap={8}>
                    <ThemeIcon 
                      size="sm" 
                      variant="light" 
                      color={getInsightColor(recommendations.insights)}
                      radius="xl"
                    >
                      {getInsightIcon(recommendations.insights)}
                    </ThemeIcon>
                    <Text fw={500} size="sm">{subtopic.title}</Text>
                  </Group>
                  {startTime[`${topic.id}-${subtopic.id}`] && (
                    <Badge color="yellow" variant="dot">In Progress</Badge>
                  )}
                </Group>

                <Group grow gap="xs">
                  <Paper p="xs" radius="md" bg="gray.0">
                    <Group gap={6} wrap="nowrap">
                      <IconClockHour4 size={16} />
                      <Text size="sm">
                        {Math.round(recommendations.strategy.recommendedTimePerSession / 60)}min
                      </Text>
                    </Group>
                  </Paper>
                  <Paper p="xs" radius="md" bg="gray.0">
                    <Group gap={6} wrap="nowrap">
                      <IconTrendingUp size={16} />
                      <Text size="sm">Level {recommendations.strategy.suggestedDifficulty}/5</Text>
                    </Group>
                  </Paper>
                </Group>

                <Collapse in={true}>
                  <Stack gap="xs" mt="sm">
                    {recommendations.insights.map((insight, index) => (
                      <Alert
                        key={index}
                        variant="light"
                        color={insight.type === 'success' ? 'green' : insight.type === 'warning' ? 'yellow' : 'blue'}
                        title={insight.type === 'success' ? 'Great Progress!' : insight.type === 'warning' ? 'Suggestion' : 'Tip'}
                        icon={getInsightTypeIcon(insight.type)}
                      >
                        <Text size="sm">{insight.message}</Text>
                        {insight.recommendation && (
                          <Text size="sm" mt={4} c="dimmed">
                            Recommendation: {insight.recommendation}
                          </Text>
                        )}
                      </Alert>
                    ))}
                    
                    <Paper p="xs" withBorder radius="md">
                      <Group justify="space-between" gap={8}>
                        <Text size="sm" c="dimmed">Next Review</Text>
                        <Text size="sm" fw={500}>
                          {recommendations.strategy.nextReviewDate.toLocaleDateString()}
                        </Text>
                      </Group>
                      {recommendations.strategy.confidenceScore > 0.7 && (
                        <Badge 
                          size="sm" 
                          variant="dot" 
                          color="green"
                          mt={6}
                        >
                          High Confidence
                        </Badge>
                      )}
                    </Paper>
                  </Stack>
                </Collapse>
              </Card>
            )
          ))}
        </Stack>
      </Stack>
    );
  };

  // Helper function to determine insight color
  const getInsightColor = (insights: Array<{ type: 'success' | 'warning' | 'info' }>) => {
    if (insights.some(i => i.type === 'success')) return 'green';
    if (insights.some(i => i.type === 'warning')) return 'yellow';
    return 'blue';
  };

  // Helper function to get insight icon
  const getInsightIcon = (insights: Array<{ type: 'success' | 'warning' | 'info' }>) => {
    if (insights.some(i => i.type === 'success')) return <IconStars size={14} />;
    if (insights.some(i => i.type === 'warning')) return <IconAlertCircle size={14} />;
    return <IconBulb size={14} />;
  };

  // Helper function to get insight type icon
  const getInsightTypeIcon = (type: 'success' | 'warning' | 'info') => {
    switch (type) {
      case 'success': return <IconStars size={16} />;
      case 'warning': return <IconAlertCircle size={16} />;
      case 'info': return <IconBulb size={16} />;
    }
  };

  return (
    <Stack>
      <Group justify="space-between" mb="md">
        <Title order={2}>Learning Progress</Title>
        <Badge 
          size="lg" 
          variant="gradient" 
          gradient={{ from: 'indigo', to: 'cyan' }}
        >
          AI-Enhanced Learning
        </Badge>
      </Group>
      
      {error && (
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          title="Notice" 
          color="yellow" 
          variant="light" 
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {roadmaps.map(roadmap => (
        <Paper key={roadmap.id} p="md" radius="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <Group gap="md">
                <ThemeIcon size="xl" variant="light" radius="md">
                  <IconBook size={24} />
                </ThemeIcon>
                <div>
                  <Text fw={700} size="lg">{roadmap.title}</Text>
                  <Text size="sm" c="dimmed">
                    {roadmap.topics.length} Learning Paths
                  </Text>
                </div>
              </Group>
              <Badge 
                size="xl" 
                variant="gradient" 
                gradient={{ from: 'blue', to: 'cyan' }}
              >
                {calculateProgress(roadmap.topics)}% Complete
              </Badge>
            </Group>

            <Divider />

            <Stack gap="md">
              {roadmap.topics.map(topic => (
                <div key={topic.id}>
                  {renderMetricsCard(topic)}
                  {expandedTopics[`${roadmap.id}-${topic.id}`] && (
                    <>
                      <Paper p="md" radius="md" withBorder>
                        <Stack gap="sm">
                          {topic.subtopics.map(subtopic => (
                            <Group key={subtopic.id} justify="space-between">
                              <Checkbox
                                size="md"
                                checked={subtopic.completed}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleSubtopicChange(roadmap.id, topic.id, subtopic.id, e.currentTarget.checked);
                                }}
                                label={
                                  <Text size="sm" fw={500}>
                                    {subtopic.title}
                                    {startTime[`${topic.id}-${subtopic.id}`] && (
                                      <Text span c="yellow" ml={6}>(In Progress...)</Text>
                                    )}
                                  </Text>
                                }
                              />
                              {subtopic.completed && (
                                <Badge color="green" variant="light">Completed</Badge>
                              )}
                            </Group>
                          ))}
                        </Stack>
                      </Paper>
                      {renderLearningInsights(topic)}
                    </>
                  )}
                  <ActionIcon
                    variant="subtle"
                    onClick={() => toggleTopic(roadmap.id, topic.id)}
                    mx="auto"
                    mt={8}
                  >
                    {expandedTopics[`${roadmap.id}-${topic.id}`] ? (
                      <IconChevronUp size={24} />
                    ) : (
                      <IconChevronDown size={24} />
                    )}
                  </ActionIcon>
                </div>
              ))}
            </Stack>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
};

export default Progress;
