import React, { useEffect, useState } from 'react';
import { 
  Paper, 
  Title, 
  Text, 
  Stack, 
  Group, 
  Badge, 
  RingProgress, 
  ThemeIcon,
  ActionIcon,
  Tooltip,
  Box,
  Card,
  Progress,
  Timeline,
  Modal,
} from '@mantine/core';
import { 
  IconBrain, 
  IconTrendingUp, 
  IconStars,
  IconChartLine,
  IconBulb,
  IconDna,
  IconTree,
  IconNetwork,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { evolutionaryLearning } from '../lib/evolutionaryLearning.ts';

interface EvolutionVisualizerProps {
  topicId: string;
  onInsightClick?: (insight: any) => void;
}

export const EvolutionVisualizer: React.FC<EvolutionVisualizerProps> = ({ 
  topicId,
  onInsightClick 
}) => {
  const [evolutionData, setEvolutionData] = useState<any>(null);
  const [showEvolutionModal, setShowEvolutionModal] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  useEffect(() => {
    // Get analytics data from evolutionary learning system
    const analytics = evolutionaryLearning.getAnalytics(topicId);
    setEvolutionData(analytics);
  }, [topicId]);

  if (!evolutionData) return null;

  const { pattern, strategy, insights } = evolutionData;

  const renderMetricCard = (title: string, value: number, icon: React.ReactNode, color: string) => (
    <Card withBorder p="md" radius="md" onClick={() => setSelectedMetric(title)}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Group>
          <ThemeIcon size="lg" color={color} variant="light">
            {icon}
          </ThemeIcon>
          <div>
            <Text size="sm" c="dimmed">{title}</Text>
            <Text fw={500}>{Math.round(value * 100)}%</Text>
          </div>
        </Group>
      </motion.div>
    </Card>
  );

  const renderEvolutionTimeline = () => (
    <Timeline active={pattern.history.length - 1} bulletSize={24} lineWidth={2}>
      {pattern.history.map((entry: any, index: number) => (
        <Timeline.Item
          key={index}
          bullet={
            <ThemeIcon
              size={24}
              radius="xl"
              color={entry.success ? 'green' : 'red'}
            >
              {entry.success ? <IconCheck size={12} /> : <IconX size={12} />}
            </ThemeIcon>
          }
          title={`Attempt ${pattern.history.length - index}`}
        >
          <Text size="sm" mt={4}>
            Time spent: {Math.round(entry.timeSpent / 60)} minutes
          </Text>
          <Text size="sm" c="dimmed">
            Difficulty: Level {entry.difficulty}/5
          </Text>
        </Timeline.Item>
      ))}
    </Timeline>
  );

  const renderSkillNetwork = () => (
    <Box
      style={{
        position: 'relative',
        height: '200px',
        border: '1px solid var(--mantine-color-gray-3)',
        borderRadius: 'var(--mantine-radius-md)',
        padding: 'var(--mantine-spacing-md)',
      }}
    >
      {/* Animated network visualization */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <IconNetwork
          size={120}
          style={{
            opacity: 0.1,
          }}
        />
      </motion.div>

      {/* Related topics */}
      {pattern.relatedTopics.map((topic: string, index: number) => (
        <motion.div
          key={topic}
          initial={{ x: 0, y: 0 }}
          animate={{
            x: Math.cos(index * (2 * Math.PI / pattern.relatedTopics.length)) * 70,
            y: Math.sin(index * (2 * Math.PI / pattern.relatedTopics.length)) * 70,
          }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
          }}
        >
          <Badge size="sm">{topic}</Badge>
        </motion.div>
      ))}
    </Box>
  );

  return (
    <Stack>
      <Group justify="space-between">
        <Group>
          <ThemeIcon size="lg" variant="light" color="blue">
            <IconDna size={20} />
          </ThemeIcon>
          <Title order={3}>Learning Evolution</Title>
        </Group>
        <Tooltip label="View Evolution Details">
          <ActionIcon
            variant="light"
            onClick={() => setShowEvolutionModal(true)}
          >
            <IconChartLine size={20} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Group grow>
        {renderMetricCard(
          'Success Rate',
          pattern.metrics.successRate,
          <IconStars size={18} />,
          'green'
        )}
        {renderMetricCard(
          'Consistency',
          pattern.metrics.consistencyScore,
          <IconTrendingUp size={18} />,
          'blue'
        )}
        {renderMetricCard(
          'Retention',
          pattern.metrics.retentionScore,
          <IconBrain size={18} />,
          'violet'
        )}
      </Group>

      <Card withBorder p="md" radius="md">
        <Stack>
          <Group justify="space-between">
            <Text fw={500}>Learning Network</Text>
            <Badge variant="dot">
              {pattern.relatedTopics.length} Related Topics
            </Badge>
          </Group>
          {renderSkillNetwork()}
        </Stack>
      </Card>

      <Modal
        opened={showEvolutionModal}
        onClose={() => setShowEvolutionModal(false)}
        title={
          <Group justify="space-between">
            <ThemeIcon size="lg" variant="light" color="blue">
              <IconTree size={20} />
            </ThemeIcon>
            <Text fw={500}>Learning Evolution Details</Text>
          </Group>
        }
        size="lg"
      >
        <Stack>
          <Text c="dimmed">
            Track your learning evolution and skill development over time.
          </Text>

          {renderEvolutionTimeline()}

          <Card withBorder p="md" radius="md">
            <Stack>
              <Text fw={500}>Current Learning Strategy</Text>
              <Group grow>
                <div>
                  <Text size="sm" c="dimmed">Recommended Time</Text>
                  <Text fw={500}>
                    {Math.round(strategy.recommendedTimePerSession / 60)} min
                  </Text>
                </div>
                <div>
                  <Text size="sm" c="dimmed">Suggested Difficulty</Text>
                  <Text fw={500}>Level {strategy.suggestedDifficulty}/5</Text>
                </div>
                <div>
                  <Text size="sm" c="dimmed">Confidence Score</Text>
                  <Text fw={500}>{Math.round(strategy.confidenceScore * 100)}%</Text>
                </div>
              </Group>
            </Stack>
          </Card>

          {insights.length > 0 && (
            <Stack>
              <Text fw={500}>Learning Insights</Text>
              {insights.map((insight: any, index: number) => (
                <Card
                  key={index}
                  withBorder
                  p="sm"
                  radius="md"
                  style={{ cursor: 'pointer' }}
                  onClick={() => onInsightClick?.(insight)}
                >
                  <Group>
                    <ThemeIcon
                      size="md"
                      color={
                        insight.type === 'success' ? 'green' :
                        insight.type === 'warning' ? 'yellow' : 'blue'
                      }
                      variant="light"
                    >
                      <IconBulb size={16} />
                    </ThemeIcon>
                    <div>
                      <Text size="sm">{insight.message}</Text>
                      {insight.recommendation && (
                        <Text size="sm" c="dimmed" mt={4}>
                          {insight.recommendation}
                        </Text>
                      )}
                    </div>
                  </Group>
                </Card>
              ))}
            </Stack>
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}; 