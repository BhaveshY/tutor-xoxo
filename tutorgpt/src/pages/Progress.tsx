import React, { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Paper,
  Stack,
  Text,
  Group,
  Select,
  Badge,
  ThemeIcon,
  Progress as MantineProgress,
  Box,
  Checkbox,
  Button,
  Tooltip,
} from '@mantine/core';
import { IconMap, IconCheck, IconCircleCheck, IconChevronDown, IconChevronRight, IconBrain } from '@tabler/icons-react';
import useStore from '../store/useStore.ts';
import { notifications } from '@mantine/notifications';
import { RoadmapTopic, TopicMetrics, Roadmap, RoadmapSubtopic } from '../types/roadmap.ts';

interface ProgressData extends Omit<Roadmap, 'content' | 'timestamp'> {
  topics: RoadmapTopic[];
  progress: number;
}

const Progress = () => {
  const { 
    roadmaps, 
    getProgress, 
    updateProgress, 
    updateTopicMetrics, 
    getTopicMetrics,
    optimizeRoadmap 
  } = useStore();
  
  const [selectedRoadmap, setSelectedRoadmap] = useState<string | null>(null);
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [startTimes, setStartTimes] = useState<Record<string, number>>({});

  useEffect(() => {
    const convertedProgress = roadmaps.map(roadmap => {
      const topics = parseRoadmapContent(roadmap.content);
      const existingProgress = getProgress(roadmap.id);

      if (existingProgress) {
        topics.forEach(topic => {
          const metrics = existingProgress.topicMetrics[topic.id];
          if (metrics) {
            topic.subtopics.forEach(subtopic => {
              const completed = metrics.subtopics[subtopic.id]?.completed || false;
              subtopic.completed = completed;
            });
            topic.completed = topic.subtopics.every(st => st.completed);
          }
        });
      }

      return {
        id: roadmap.id,
        title: roadmap.title,
        topics,
        progress: calculateProgress(topics),
      };
    });
    
    setProgressData(convertedProgress);
  }, [roadmaps, getProgress]);

  const parseRoadmapContent = (content: string): RoadmapTopic[] => {
    const lines = content.split('\n');
    const topics: RoadmapTopic[] = [];
    let currentTopic: RoadmapTopic | null = null;

    lines.forEach(line => {
      if (line.startsWith('## Milestone')) {
        if (currentTopic) {
          topics.push(currentTopic);
        }
        const title = line.replace('## Milestone', '').trim().split(':')[1]?.trim() || 'Untitled';
        currentTopic = {
          id: Date.now().toString() + Math.random(),
          title,
          subtopics: [],
          completed: false,
        };
      } else if (line.startsWith('- ') && currentTopic) {
        const title = line.replace('- ', '').trim();
        currentTopic.subtopics.push({
          id: Date.now().toString() + Math.random(),
          title,
          completed: false,
        });
      }
    });

    if (currentTopic) {
      topics.push(currentTopic);
    }

    return topics;
  };

  const calculateProgress = (topics: RoadmapTopic[]): number => {
    let totalSubtopics = 0;
    let completedSubtopics = 0;

    topics.forEach(topic => {
      totalSubtopics += topic.subtopics.length;
      completedSubtopics += topic.subtopics.filter(st => st.completed).length;
    });

    return totalSubtopics === 0 ? 0 : Math.round((completedSubtopics / totalSubtopics) * 100);
  };

  const handleSubtopicToggle = (topicId: string, subtopicId: string) => {
    if (!selectedRoadmap) return;

    const currentTime = Date.now();
    const startTime = startTimes[`${topicId}-${subtopicId}`] || currentTime;
    const timeSpent = currentTime - startTime;

    setProgressData(prevData => {
      const updatedData = prevData.map(data => {
        if (data.id === selectedRoadmap) {
          const updatedTopics = data.topics.map(topic => {
            if (topic.id === topicId) {
              const updatedSubtopics = topic.subtopics.map(subtopic => {
                if (subtopic.id === subtopicId) {
                  return { ...subtopic, completed: !subtopic.completed };
                }
                return subtopic;
              });
              
              const allCompleted = updatedSubtopics.every(st => st.completed);
              return {
                ...topic,
                subtopics: updatedSubtopics,
                completed: allCompleted,
              };
            }
            return topic;
          });

          // Update metrics
          const topic = updatedTopics.find(t => t.id === topicId);
          if (topic) {
            const subtopic = topic.subtopics.find(st => st.id === subtopicId);
            if (subtopic) {
              const metrics = getTopicMetrics(selectedRoadmap, topicId) || {
                timeSpent: 0,
                attempts: 0,
                successRate: 0,
                difficulty: 0.5,
                lastAttempt: new Date(),
              };

              const newMetrics: Partial<TopicMetrics> = {
                timeSpent: metrics.timeSpent + timeSpent,
                attempts: metrics.attempts + 1,
                successRate: subtopic.completed ? 
                  (metrics.successRate * metrics.attempts + 1) / (metrics.attempts + 1) :
                  (metrics.successRate * metrics.attempts) / (metrics.attempts + 1),
              };

              updateTopicMetrics(selectedRoadmap, topicId, newMetrics);
            }
          }

          return {
            ...data,
            topics: updatedTopics,
            progress: calculateProgress(updatedTopics),
          };
        }
        return data;
      });

      // Update progress in store
      const updatedRoadmap = updatedData.find(d => d.id === selectedRoadmap);
      if (updatedRoadmap) {
        updateProgress({
          roadmapId: selectedRoadmap,
          topicMetrics: {},
          lastUpdated: new Date(),
        });
      }

      return updatedData;
    });

    // Reset start time for the next attempt
    setStartTimes(prev => ({
      ...prev,
      [`${topicId}-${subtopicId}`]: currentTime,
    }));
  };

  const handleOptimize = () => {
    if (!selectedRoadmap) return;

    optimizeRoadmap(selectedRoadmap);
    notifications.show({
      title: 'Roadmap Optimized',
      message: 'Your learning pathway has been optimized based on your performance.',
      color: 'green',
    });
  };

  const toggleTopic = (e: React.MouseEvent, topicId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedTopics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(topicId)) {
        newSet.delete(topicId);
      } else {
        newSet.add(topicId);
      }
      return newSet;
    });

    // Start timing when topic is expanded
    const currentTime = Date.now();
    const roadmap = progressData.find(r => r.id === selectedRoadmap);
    if (roadmap) {
      const topic = roadmap.topics.find(t => t.id === topicId);
      if (topic) {
        topic.subtopics.forEach(subtopic => {
          if (!subtopic.completed) {
            setStartTimes(prev => ({
              ...prev,
              [`${topicId}-${subtopic.id}`]: currentTime,
            }));
          }
        });
      }
    }
  };

  const selectedProgress = selectedRoadmap ? progressData.find(p => p.id === selectedRoadmap) : null;

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <Title order={2}>Learning Progress</Title>
          <Group>
            <Select
              placeholder="Select a roadmap"
              data={roadmaps.map(r => ({ value: r.id, label: r.title }))}
              value={selectedRoadmap}
              onChange={setSelectedRoadmap}
              style={{ width: 300 }}
              leftSection={<IconMap size={20} />}
            />
            {selectedRoadmap && (
              <Tooltip label="Optimize learning pathway based on your performance">
                <Button
                  variant="light"
                  color="blue"
                  leftSection={<IconBrain size={20} />}
                  onClick={handleOptimize}
                >
                  Optimize Pathway
                </Button>
              </Tooltip>
            )}
          </Group>
        </Group>

        {selectedProgress && (
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Group justify="space-between" align="center">
                <Text size="xl" fw={500}>{selectedProgress.title}</Text>
                <Badge size="lg" variant="filled" color={selectedProgress.progress === 100 ? 'green' : 'blue'}>
                  {selectedProgress.progress}% Complete
                </Badge>
              </Group>

              <MantineProgress
                value={selectedProgress.progress}
                size="xl"
                color={selectedProgress.progress === 100 ? 'green' : 'blue'}
                radius="xl"
              />

              <Stack gap="md">
                {selectedProgress.topics.map((topic: RoadmapTopic) => {
                  const metrics = selectedRoadmap ? getTopicMetrics(selectedRoadmap, topic.id) : undefined;
                  return (
                    <Paper key={topic.id} withBorder>
                      <Box>
                        <Group 
                          p="md" 
                          style={{ cursor: 'pointer' }}
                          onClick={(e) => toggleTopic(e, topic.id)}
                        >
                          <Group gap="sm">
                            {expandedTopics.has(topic.id) ? (
                              <IconChevronDown size={20} />
                            ) : (
                              <IconChevronRight size={20} />
                            )}
                            <ThemeIcon 
                              color={topic.completed ? 'green' : 'blue'} 
                              variant="light"
                              size="lg"
                            >
                              {topic.completed ? <IconCircleCheck size={20} /> : <IconMap size={20} />}
                            </ThemeIcon>
                          </Group>
                          <div style={{ flex: 1 }}>
                            <Text fw={500}>{topic.title}</Text>
                            <Group gap="xs">
                              <Text size="sm" c="dimmed">
                                {topic.subtopics.filter((st: RoadmapSubtopic) => st.completed).length} of {topic.subtopics.length} completed
                              </Text>
                              {metrics && (
                                <Text size="sm" c="dimmed">
                                  • Success Rate: {Math.round(metrics.successRate * 100)}%
                                  • Time Spent: {Math.round(metrics.timeSpent / 60000)}min
                                </Text>
                              )}
                            </Group>
                          </div>
                          <Badge color={topic.completed ? 'green' : 'blue'}>
                            {Math.round((topic.subtopics.filter((st: RoadmapSubtopic) => st.completed).length / topic.subtopics.length) * 100)}%
                          </Badge>
                        </Group>

                        {expandedTopics.has(topic.id) && (
                          <Stack gap="xs" p="md" pt={0}>
                            {topic.subtopics.map((subtopic: RoadmapSubtopic) => (
                              <Group key={subtopic.id} justify="space-between" onClick={(e) => e.stopPropagation()}>
                                <Box style={{ flex: 1 }} onClick={(e) => e.stopPropagation()}>
                                  <Checkbox
                                    label={subtopic.title}
                                    checked={subtopic.completed}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      handleSubtopicToggle(topic.id, subtopic.id);
                                    }}
                                    styles={{
                                      label: {
                                        textDecoration: subtopic.completed ? 'line-through' : 'none',
                                        color: subtopic.completed ? 'var(--mantine-color-dimmed)' : undefined,
                                        cursor: 'pointer',
                                      },
                                      input: {
                                        cursor: 'pointer',
                                      },
                                    }}
                                  />
                                </Box>
                                {subtopic.completed && (
                                  <ThemeIcon color="green" variant="light">
                                    <IconCheck size={16} />
                                  </ThemeIcon>
                                )}
                              </Group>
                            ))}
                          </Stack>
                        )}
                      </Box>
                    </Paper>
                  );
                })}
              </Stack>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Container>
  );
};

export default Progress; 