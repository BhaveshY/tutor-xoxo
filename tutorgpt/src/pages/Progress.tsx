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
} from '@mantine/core';
import { IconBook } from '@tabler/icons-react';
import { RoadmapTopic, RoadmapSubtopic, Roadmap } from '../types/roadmap.ts';

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
    // Match subtopic (starts with - or * and may have a checkbox)
    else if (trimmedLine.match(/^[-*]\s+(\[[ x]\]\s+)?/)) {
      if (!currentTopic) return;
      
      // Remove checkbox and bullet point to get clean title
      const title = trimmedLine
        .replace(/^[-*]\s+/, '') // Remove bullet point
        .replace(/\[[ x]\]\s*/, ''); // Remove checkbox
      
      // Check if the subtopic was marked as completed
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

  // Update topic completion status based on subtopics
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

  useEffect(() => {
    console.log('Roadmaps changed:', roadmaps);
  }, [roadmaps]);

  const toggleTopic = (roadmapId: string, topicId: string) => {
    setExpandedTopics(prev => ({
      ...prev,
      [`${roadmapId}-${topicId}`]: !prev[`${roadmapId}-${topicId}`]
    }));
  };

  const handleSubtopicChange = (roadmapId: string, topicId: string, subtopicId: string, completed: boolean) => {
    updateRoadmapProgress(roadmapId, topicId, subtopicId, completed);
  };

  return (
    <Stack>
      <Title order={2}>Learning Progress</Title>
      {roadmaps.map(roadmap => {
        console.log('Processing roadmap:', roadmap);
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
                            // When a topic is checked/unchecked, update all its subtopics
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
