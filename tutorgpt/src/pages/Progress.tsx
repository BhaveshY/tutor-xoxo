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
import { IconMap, IconCheck, IconCircleCheck, IconChevronDown, IconChevronRight, IconBrain, IconClock } from '@tabler/icons-react';
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

    // Store original order for comparison
    const originalOrder = progressData.find(p => p.id === selectedRoadmap)?.topics.map(t => t.id) || [];

    optimizeRoadmap(selectedRoadmap);

    // Force refresh of progress data to reflect changes
    const updatedRoadmap = roadmaps.find(r => r.id === selectedRoadmap);
    if (updatedRoadmap) {
      setProgressData(prevData => 
        prevData.map(data => 
          data.id === selectedRoadmap 
            ? {
                ...data,
                topics: updatedRoadmap.topics.map(topic => ({
                  ...topic,
                  isReordered: originalOrder.indexOf(topic.id) !== updatedRoadmap.topics.findIndex(t => t.id === topic.id)
                }))
              }
            : data
        )
      );
    }

    // Calculate changes
    const changes = updatedRoadmap?.topics.map((topic, index) => {
      const oldIndex = originalOrder.indexOf(topic.id);
      const metrics = getTopicMetrics(selectedRoadmap, topic.id);
      
      let reason = '';
      if (metrics) {
        if (metrics.consistencyScore > 0.7) reason = 'High consistency in learning pattern';
        else if (metrics.retentionRate > 0.7) reason = 'Good retention rate';
        else if (metrics.averageTimePerSubtopic >= 20 && metrics.averageTimePerSubtopic <= 40) 
          reason = 'Optimal time management';
        else reason = 'Better prerequisite ordering';
      }

      return {
        topicId: topic.id,
        title: topic.title,
        moved: index !== oldIndex,
        oldPosition: oldIndex + 1,
        newPosition: index + 1,
        reason
      };
    }).filter(change => change.moved) || [];

    // Show optimization summary
    if (changes.length > 0) {
      notifications.show({
        title: 'Roadmap Optimized',
        message: (
          <Stack>
            <Text size="sm" fw={500}>Topics have been reordered based on your learning patterns:</Text>
            {changes.map((change, index) => (
              <Box key={index}>
                <Text size="sm">
                  "{change.title}" {change.oldPosition < change.newPosition ? 'moved down' : 'moved up'} to position {change.newPosition}
                </Text>
                <Text size="xs" c="dimmed">Reason: {change.reason}</Text>
              </Box>
            ))}
            <Text size="xs" c="dimmed" mt="sm">
              💡 Topics are ordered based on your performance, learning patterns, and topic dependencies.
              The completion status of all topics and subtopics is preserved.
            </Text>
          </Stack>
        ),
        color: 'blue',
        autoClose: false,
      });
    } else {
      notifications.show({
        title: 'No Changes Needed',
        message: 'The current order is already optimal based on your learning patterns.',
        color: 'green',
      });
    }
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
              <Tooltip label="Optimize the learning pathway based on your performance and learning patterns">
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
                <Group>
                  <Text size="sm" c="dimmed">
                    Topics are ordered by learning efficiency
                  </Text>
                  <Badge size="lg" variant="filled" color={selectedProgress.progress === 100 ? 'green' : 'blue'}>
                    {selectedProgress.progress}% Complete
                  </Badge>
                </Group>
              </Group>

              <MantineProgress
                value={selectedProgress.progress}
                size="xl"
                color={selectedProgress.progress === 100 ? 'green' : 'blue'}
                radius="xl"
              />

              <Stack gap="md">
                {selectedProgress.topics.map((topic: RoadmapTopic & { isReordered?: boolean }) => {
                  const metrics = selectedRoadmap ? getTopicMetrics(selectedRoadmap, topic.id) : undefined;
                  return (
                    <Paper 
                      key={topic.id} 
                      withBorder
                      style={{
                        transition: 'all 0.3s ease',
                        transform: topic.isReordered ? 'scale(1.01)' : 'scale(1)',
                        border: topic.isReordered ? '1px solid var(--mantine-color-blue-5)' : undefined,
                      }}
                    >
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
                              color={topic.completed ? 'green' : topic.isReordered ? 'blue' : 'gray'} 
                              variant="light"
                              size="lg"
                            >
                              {topic.completed ? <IconCircleCheck size={20} /> : <IconMap size={20} />}
                            </ThemeIcon>
                          </Group>
                          <div style={{ flex: 1 }}>
                            <Group gap="xs" align="center">
                              <Text fw={500}>{topic.title}</Text>
                              {topic.isReordered && (
                                <Badge size="sm" variant="dot" color="blue">
                                  Reordered
                                </Badge>
                              )}
                            </Group>
                            <Group gap="xs">
                              <Text size="sm" c="dimmed">
                                {topic.subtopics.filter((st: RoadmapSubtopic) => st.completed).length} of {topic.subtopics.length} completed
                              </Text>
                              {metrics && (
                                <>
                                  <Text size="sm" c="dimmed">
                                    • Success Rate: {Math.round(metrics.successRate * 100)}%
                                    • Time Spent: {Math.round(metrics.timeSpent / 60000)}min
                                  </Text>
                                  <Group gap={4}>
                                    {metrics.consistencyScore > 0.7 && (
                                      <Tooltip label={`High Learning Consistency (${Math.round(metrics.consistencyScore * 100)}%)`}>
                                        <ThemeIcon color="green" variant="light" size="sm">
                                          <IconBrain size={12} />
                                        </ThemeIcon>
                                      </Tooltip>
                                    )}
                                    {metrics.retentionRate > 0.7 && (
                                      <Tooltip label={`Good Knowledge Retention (${Math.round(metrics.retentionRate * 100)}%)`}>
                                        <ThemeIcon color="blue" variant="light" size="sm">
                                          <IconCheck size={12} />
                                        </ThemeIcon>
                                      </Tooltip>
                                    )}
                                    {metrics.averageTimePerSubtopic >= 20 && metrics.averageTimePerSubtopic <= 40 && (
                                      <Tooltip label={`Optimal Study Time (${Math.round(metrics.averageTimePerSubtopic)} min/subtopic)`}>
                                        <ThemeIcon color="violet" variant="light" size="sm">
                                          <IconClock size={12} />
                                        </ThemeIcon>
                                      </Tooltip>
                                    )}
                                  </Group>
                                </>
                              )}
                            </Group>
                          </div>
                          <Group gap="xs">
                            <Badge color={topic.completed ? 'green' : 'blue'}>
                              {Math.round((topic.subtopics.filter((st: RoadmapSubtopic) => st.completed).length / topic.subtopics.length) * 100)}%
                            </Badge>
                            {topic.isReordered && (
                              <Tooltip label="Topic position optimized based on your learning patterns">
                                <ThemeIcon color="blue" variant="light" size="sm">
                                  <IconBrain size={12} />
                                </ThemeIcon>
                              </Tooltip>
                            )}
                          </Group>
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