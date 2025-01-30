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
} from '@mantine/core';
import { IconBook, IconBrain, IconAlertCircle } from '@tabler/icons-react';
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

  const renderLearningInsights = (topic: RoadmapTopic) => {
    const patterns = topic.subtopics.map(subtopic => {
      const recommendations = evolutionaryLearning.getRecommendations(subtopic.id);
      return { subtopic, recommendations };
    }).filter(({ recommendations }) => recommendations?.strategy !== null);

    if (patterns.length === 0) return null;

    return (
      <Stack gap="xs" mt="sm">
        <Text size="sm" fw={500} c="dimmed">Learning Insights:</Text>
        {patterns.map(({ subtopic, recommendations }) => (
          recommendations?.strategy && (
            <Box key={subtopic.id}>
              <Tooltip
                label={
                  <Box maw={300}>
                    <Stack gap={5}>
                      <Text size="sm">Recommended session: {Math.round(recommendations.strategy.recommendedTimePerSession / 60)} minutes</Text>
                      <Text size="sm">Next review: {recommendations.strategy.nextReviewDate.toLocaleDateString()}</Text>
                      <Text size="sm">Difficulty level: {recommendations.strategy.suggestedDifficulty}/5</Text>
                      {recommendations.strategy.confidenceScore > 0.7 && (
                        <Text size="sm" c="dimmed">Confidence: High</Text>
                      )}
                      {recommendations.insights.map((insight, index) => (
                        <Text 
                          key={index} 
                          size="sm" 
                          c={insight.type === 'success' ? 'green' : insight.type === 'warning' ? 'yellow' : 'blue'}
                        >
                          {insight.message}
                        </Text>
                      ))}
                    </Stack>
                  </Box>
                }
                multiline
                position="right"
              >
                <Group gap="xs" style={{ cursor: 'help' }}>
                  <ThemeIcon 
                    size="sm" 
                    variant="light" 
                    color={getInsightColor(recommendations.insights)}
                  >
                    <IconBrain size={14} />
                  </ThemeIcon>
                  <Stack gap={2}>
                    <Text size="sm" c="dimmed">
                      {subtopic.title}
                      {startTime[`${topic.id}-${subtopic.id}`] && ' (In Progress...)'}
                    </Text>
                    {recommendations.insights.length > 0 && (
                      <Text size="xs" c="dimmed">
                        {recommendations.insights[0].recommendation}
                      </Text>
                    )}
                  </Stack>
                </Group>
              </Tooltip>
            </Box>
          )
        ))}
      </Stack>
    );
  };

  // Helper function to determine insight color
  const getInsightColor = (insights: Array<{ type: 'success' | 'warning' | 'info' }>) => {
    if (insights.some(i => i.type === 'success')) return 'green';
    if (insights.some(i => i.type === 'warning')) return 'yellow';
    return 'blue';
  };

  return (
    <Stack>
      <Title order={2}>Learning Progress</Title>
      
      {error && (
        <Alert icon={<IconAlertCircle size={16} />} title="Notice" color="yellow" variant="light" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {roadmaps.map(roadmap => {
        const progress = calculateProgress(roadmap.topics);
        return (
          <Paper key={roadmap.id} p="md" withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Group>
                  <ThemeIcon size="lg" variant="light">
                    <IconBook size={20} />
                  </ThemeIcon>
                  <div>
                    <Text fw={500}>{roadmap.title}</Text>
                    <Text size="sm" c="dimmed">
                      {roadmap.topics.length} topics
                    </Text>
                  </div>
                </Group>
                <Badge size="lg">{progress}% Complete</Badge>
              </Group>

              <MantineProgress
                value={progress}
                size="lg"
                radius="xl"
                color={progress === 100 ? 'green' : 'blue'}
              />

              <Stack gap="xs">
                {roadmap.topics.map(topic => (
                  <Paper 
                    key={topic.id} 
                    p="xs" 
                    withBorder
                    onClick={() => toggleTopic(roadmap.id, topic.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Stack gap="xs">
                      <Group>
                        <Checkbox
                          checked={topic.completed}
                          onChange={(e) => {
                            e.stopPropagation();
                            topic.subtopics.forEach(subtopic => {
                              handleSubtopicChange(roadmap.id, topic.id, subtopic.id, e.currentTarget.checked);
                            });
                          }}
                          label={topic.title}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Badge size="sm">
                          {topic.subtopics.filter(st => st.completed).length}/{topic.subtopics.length}
                        </Badge>
                      </Group>

                      {expandedTopics[`${roadmap.id}-${topic.id}`] && (
                        <>
                          <Stack gap="xs" ml="xl">
                            {topic.subtopics.map(subtopic => (
                              <Group key={subtopic.id}>
                                <Checkbox
                                  size="sm"
                                  checked={subtopic.completed}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleSubtopicChange(roadmap.id, topic.id, subtopic.id, e.currentTarget.checked);
                                  }}
                                  label={subtopic.title}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </Group>
                            ))}
                          </Stack>
                          {renderLearningInsights(topic)}
                        </>
                      )}
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
};

export default Progress;
