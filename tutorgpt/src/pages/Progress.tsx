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
} from '@mantine/core';
import { IconMap, IconCheck, IconCircleCheck, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import useStore from '../store/useStore.ts';
import { notifications } from '@mantine/notifications';

interface RoadmapTopic {
  id: string;
  title: string;
  subtopics: {
    id: string;
    title: string;
    completed: boolean;
  }[];
  completed: boolean;
}

interface RoadmapProgress {
  id: string;
  title: string;
  topics: RoadmapTopic[];
  progress: number;
}

const Progress = () => {
  const { roadmaps, getProgress, updateProgress } = useStore();
  const [selectedRoadmap, setSelectedRoadmap] = useState<string | null>(null);
  const [progressData, setProgressData] = useState<RoadmapProgress[]>([]);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  useEffect(() => {
    const convertedProgress = roadmaps.map(roadmap => {
      const topics = parseRoadmapContent(roadmap.content);
      const existingProgress = getProgress(roadmap.id);

      if (existingProgress) {
        topics.forEach(topic => {
          const storedTopic = existingProgress.topics.find(t => t.id === topic.id);
          if (storedTopic) {
            topic.subtopics.forEach(subtopic => {
              const storedSubtopic = storedTopic.subtopics.find(st => st.id === subtopic.id);
              if (storedSubtopic) {
                subtopic.completed = storedSubtopic.completed;
              }
            });
            topic.completed = topic.subtopics.every(st => st.completed);
          }
        });
      }

      const progress = calculateProgress(topics);
      
      return {
        id: roadmap.id,
        title: roadmap.title,
        topics,
        progress,
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
    setProgressData(prevData => {
      const newData = prevData.map(roadmap => {
        if (roadmap.id === selectedRoadmap) {
          const updatedTopics = roadmap.topics.map(topic => {
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

          const progress = calculateProgress(updatedTopics);
          const updatedRoadmap = {
            ...roadmap,
            topics: updatedTopics,
            progress,
          };

          // Update the stored progress
          updateProgress({
            roadmapId: updatedRoadmap.id,
            topics: updatedTopics.map(topic => ({
              id: topic.id,
              subtopics: topic.subtopics.map(st => ({
                id: st.id,
                completed: st.completed,
              })),
            })),
            lastUpdated: new Date(),
          });

          return updatedRoadmap;
        }
        return roadmap;
      });

      return newData;
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
  };

  const selectedProgress = progressData.find(p => p.id === selectedRoadmap);

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <Title order={2}>Learning Progress</Title>
          <Select
            placeholder="Select a roadmap"
            data={progressData.map(r => ({ value: r.id, label: r.title }))}
            value={selectedRoadmap}
            onChange={setSelectedRoadmap}
            style={{ width: 300 }}
            leftSection={<IconMap size={20} />}
          />
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
                {selectedProgress.topics.map(topic => (
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
                          <Text size="sm" c="dimmed">
                            {topic.subtopics.filter(st => st.completed).length} of {topic.subtopics.length} completed
                          </Text>
                        </div>
                        <Badge color={topic.completed ? 'green' : 'blue'}>
                          {Math.round((topic.subtopics.filter(st => st.completed).length / topic.subtopics.length) * 100)}%
                        </Badge>
                      </Group>

                      {expandedTopics.has(topic.id) && (
                        <Stack gap="xs" p="md" pt={0}>
                          {topic.subtopics.map(subtopic => (
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
                ))}
              </Stack>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Container>
  );
};

export default Progress; 