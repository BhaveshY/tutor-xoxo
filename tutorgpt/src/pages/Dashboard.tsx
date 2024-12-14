import React, { useEffect, useRef } from 'react';
import {
  Container,
  Paper,
  Text,
  Textarea,
  Button,
  Stack,
  Title,
  Group,
  Select,
  Box,
  Divider,
  ActionIcon,
  Tooltip,
  List,
  ThemeIcon,
  Badge,
  Radio,
  Group as RadioGroup,
  Group as MantineGroup,
} from '@mantine/core';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import useStore from '../store/useStore.ts';
import { Editor } from '@monaco-editor/react';
import { llmService } from '../services/llmService.ts';
import {
  IconRefresh,
  IconSend,
  IconBrain,
  IconBookmark,
  IconMap,
  IconListCheck,
  IconArrowRight,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import '../styles/markdown.css';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface SavedQuestion {
  id: string;
  question: string;
  timestamp: Date;
}

interface PracticeQuestion {
  id: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  selectedAnswer?: string;
  isCorrect?: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface SavedRoadmap {
  id: string;
  title: string;
  content: string;
  timestamp: Date;
}

interface PracticeStats {
  total: number;
  correct: number;
  incorrect: number;
  streak: number;
}

const Dashboard = () => {
  const { currentMode, user } = useStore();
  const [userInput, setUserInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [savedQuestions, setSavedQuestions] = useState<SavedQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [roadmaps, setRoadmaps] = useState<SavedRoadmap[]>([]);
  const [practiceQuestions, setPracticeQuestions] = useState<PracticeQuestion[]>([]);
  const [selectedRoadmap, setSelectedRoadmap] = useState<SavedRoadmap | null>(null);
  const [showExplanation, setShowExplanation] = useState<Record<string, boolean>>({});
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const [practiceStats, setPracticeStats] = useState<PracticeStats>({
    total: 0,
    correct: 0,
    incorrect: 0,
    streak: 0,
  });
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('medium');

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const subjects = [
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Computer Science',
    'History',
    'Literature',
    'General Knowledge',
  ];

  const handleSubmit = async () => {
    if (!userInput.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Please enter your question',
        color: 'red',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Add user message to chat
      const userMessage: ChatMessage = {
        role: 'user',
        content: userInput,
        timestamp: new Date(),
      };
      setChatHistory(prev => [...prev, userMessage]);

      // Get AI response
      const result = await llmService.generateTutorResponse(
        `[Subject: ${selectedSubject || 'General'}] ${userInput}`
      );

      if (result.error) {
        throw new Error(result.error);
      }

      // Add AI response to chat
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: result.content,
        timestamp: new Date(),
      };
      setChatHistory(prev => [...prev, aiMessage]);

      // Clear input
      setUserInput('');

      notifications.show({
        title: 'Success',
        message: 'Response generated successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to generate response',
        color: 'red',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveQuestion = () => {
    if (!userInput.trim()) return;
    const newQuestion: SavedQuestion = {
      id: Date.now().toString(),
      question: userInput,
      timestamp: new Date(),
    };
    setSavedQuestions(prev => [...prev, newQuestion]);
    notifications.show({
      title: 'Success',
      message: 'Question saved successfully',
      color: 'green',
    });
  };

  const handleLoadQuestion = (question: SavedQuestion) => {
    setUserInput(question.question);
  };

  const clearChat = () => {
    setChatHistory([]);
    notifications.show({
      title: 'Success',
      message: 'Chat history cleared',
      color: 'blue',
    });
  };

  const handleRoadmapSubmit = async () => {
    if (!userInput.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Please describe your learning goals',
        color: 'red',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await llmService.generateRoadmap(userInput);
      if (result.error) throw new Error(result.error);

      const newRoadmap: SavedRoadmap = {
        id: Date.now().toString(),
        title: userInput,
        content: result.content,
        timestamp: new Date(),
      };

      setRoadmaps(prev => [newRoadmap, ...prev]);
      setSelectedRoadmap(newRoadmap);
      setUserInput('');

      notifications.show({
        title: 'Success',
        message: 'Roadmap generated successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to generate roadmap',
        color: 'red',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePracticeSubmit = async () => {
    if (!userInput.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a topic for practice questions',
        color: 'red',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await llmService.generatePracticeQuestions({
        prompt: userInput,
        difficulty: selectedDifficulty as 'easy' | 'medium' | 'hard'
      });
      
      if (result.error) throw new Error(result.error);

      const questions = JSON.parse(result.content) as PracticeQuestion[];
      setPracticeQuestions(questions);
      setUserInput('');

      notifications.show({
        title: 'Success',
        message: 'Practice questions generated successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to generate questions',
        color: 'red',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSubmit = (questionId: string, selectedAnswer: string) => {
    setPracticeQuestions(prev =>
      prev.map(q => {
        if (q.id === questionId) {
          const isCorrect = selectedAnswer.toUpperCase() === q.correct.toUpperCase();
          
          setPracticeStats(stats => ({
            total: stats.total + 1,
            correct: stats.correct + (isCorrect ? 1 : 0),
            incorrect: stats.incorrect + (isCorrect ? 0 : 1),
            streak: isCorrect ? stats.streak + 1 : 0,
          }));

          return {
            ...q,
            selectedAnswer,
            isCorrect,
          };
        }
        return q;
      })
    );
    setShowExplanation(prev => ({ ...prev, [questionId]: true }));
  };

  const renderTutorMode = () => (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Title order={2}>AI Tutor</Title>
        <Select
          placeholder="Select subject"
          data={subjects}
          value={selectedSubject}
          onChange={setSelectedSubject}
          clearable
          style={{ width: 200 }}
        />
      </Group>

      <Group grow align="flex-start">
        <Stack style={{ flex: 2 }}>
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Text size="lg" fw={500}>Chat</Text>
                <Tooltip label="Clear chat">
                  <ActionIcon variant="light" onClick={clearChat}>
                    <IconRefresh size={20} />
                  </ActionIcon>
                </Tooltip>
              </Group>
              <Box ref={chatBoxRef} style={{ height: '400px', overflowY: 'auto' }}>
                {chatHistory.map((message, index) => (
                  <Paper
                    key={index}
                    p="md"
                    mb="sm"
                    bg={message.role === 'user' ? 'gray.1' : 'blue.1'}
                  >
                    <Text size="sm" c="dimmed" mb="xs">
                      {message.role === 'user' ? user?.name || 'You' : 'AI Tutor'} •{' '}
                      {message.timestamp.toLocaleTimeString()}
                    </Text>
                    <Box className="markdown-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </Box>
                  </Paper>
                ))}
              </Box>
              <Group>
                <Textarea
                  placeholder="Ask your question..."
                  value={userInput}
                  onChange={(e) => setUserInput(e.currentTarget.value)}
                  minRows={3}
                  style={{ flex: 1 }}
                  disabled={isLoading}
                />
                <Stack>
                  <Tooltip label="Send question">
                    <ActionIcon
                      variant="filled"
                      color="blue"
                      onClick={handleSubmit}
                      loading={isLoading}
                      disabled={!userInput.trim()}
                    >
                      <IconSend size={20} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Save question">
                    <ActionIcon
                      variant="light"
                      color="blue"
                      onClick={handleSaveQuestion}
                      disabled={!userInput.trim()}
                    >
                      <IconBookmark size={20} />
                    </ActionIcon>
                  </Tooltip>
                </Stack>
              </Group>
            </Stack>
          </Paper>
        </Stack>

        <Stack style={{ flex: 1 }}>
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Text size="lg" fw={500}>Saved Questions</Text>
                <IconBrain size={20} />
              </Group>
              <Divider />
              {savedQuestions.length === 0 ? (
                <Text c="dimmed" ta="center" py="xl">
                  No saved questions yet
                </Text>
              ) : (
                savedQuestions.map((q) => (
                  <Paper
                    key={q.id}
                    p="xs"
                    withBorder
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleLoadQuestion(q)}
                  >
                    <Text size="sm" lineClamp={2}>
                      {q.question}
                    </Text>
                    <Text size="xs" c="dimmed" mt={4}>
                      {q.timestamp.toLocaleDateString()}
                    </Text>
                  </Paper>
                ))
              )}
            </Stack>
          </Paper>
        </Stack>
      </Group>
    </Stack>
  );

  const renderRoadmapMode = () => (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Title order={2}>Learning Roadmap Generator</Title>
        <Group>
          <Select
            placeholder="Select subject"
            data={subjects}
            value={selectedSubject}
            onChange={setSelectedSubject}
            clearable
            style={{ width: 200 }}
          />
          <Badge size="lg" variant="light">
            {roadmaps.length} Saved Roadmaps
          </Badge>
        </Group>
      </Group>

      <Group grow align="flex-start">
        <Stack style={{ flex: 2 }}>
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Text fw={500}>Describe Your Learning Goals</Text>
              <Textarea
                value={userInput}
                onChange={(e) => setUserInput(e.currentTarget.value)}
                placeholder="What do you want to learn? Be specific about your goals, current level, and time commitment..."
                minRows={4}
                autosize
                maxRows={8}
                disabled={isLoading}
              />
              <Group justify="flex-end">
                <Button
                  leftSection={<IconMap size={20} />}
                  onClick={handleRoadmapSubmit}
                  loading={isLoading}
                  variant="gradient"
                  gradient={{ from: 'blue', to: 'cyan' }}
                >
                  Generate Roadmap
                </Button>
              </Group>
            </Stack>
          </Paper>

          {selectedRoadmap && (
            <Paper p="md" withBorder shadow="sm">
              <Stack gap="md">
                <Group justify="apart">
                  <Stack gap={0}>
                    <Text size="lg" fw={600}>{selectedRoadmap.title}</Text>
                    <Text size="sm" c="dimmed">
                      Created on {selectedRoadmap.timestamp.toLocaleDateString()}
                    </Text>
                  </Stack>
                  <Group>
                    <Button 
                      variant="light" 
                      color="red" 
                      size="sm"
                      onClick={() => {
                        setRoadmaps(prev => prev.filter(r => r.id !== selectedRoadmap.id));
                        setSelectedRoadmap(null);
                        notifications.show({
                          title: 'Success',
                          message: 'Roadmap deleted successfully',
                          color: 'green',
                        });
                      }}
                    >
                      Delete
                    </Button>
                    <Button 
                      variant="light" 
                      size="sm"
                      onClick={() => {
                        const content = `# ${selectedRoadmap.title}\n\n${selectedRoadmap.content}`;
                        const blob = new Blob([content], { type: 'text/markdown' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `roadmap-${selectedRoadmap.title.toLowerCase().replace(/\s+/g, '-')}.md`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        notifications.show({
                          title: 'Success',
                          message: 'Roadmap downloaded successfully',
                          color: 'green',
                        });
                      }}
                    >
                      Download
                    </Button>
                  </Group>
                </Group>
                <Box className="markdown-content" style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {selectedRoadmap.content}
                  </ReactMarkdown>
                </Box>
              </Stack>
            </Paper>
          )}
        </Stack>

        <Stack style={{ flex: 1 }}>
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={500}>Saved Roadmaps</Text>
                <IconMap size={20} />
              </Group>
              <Divider />
              {roadmaps.length === 0 ? (
                <Stack align="center" gap="xs" py="xl">
                  <IconMap size={40} stroke={1.5} color="gray" />
                  <Text c="dimmed" ta="center">
                    No saved roadmaps yet
                  </Text>
                  <Text size="sm" c="dimmed" ta="center">
                    Generate your first learning roadmap to get started
                  </Text>
                </Stack>
              ) : (
                <Stack gap="sm">
                  {roadmaps.map((roadmap) => (
                    <Paper
                      key={roadmap.id}
                      p="sm"
                      withBorder
                      style={{ 
                        cursor: 'pointer',
                        backgroundColor: selectedRoadmap?.id === roadmap.id ? 'var(--mantine-color-blue-light)' : undefined
                      }}
                      onClick={() => setSelectedRoadmap(roadmap)}
                    >
                      <Stack gap="xs">
                        <Text size="sm" fw={500} lineClamp={2}>
                          {roadmap.title}
                        </Text>
                        <Group justify="apart">
                          <Text size="xs" c="dimmed">
                            {roadmap.timestamp.toLocaleDateString()}
                          </Text>
                          <Badge size="sm" variant="light">
                            {roadmap.content.split('\n').filter(line => line.trim().startsWith('- ')).length} steps
                          </Badge>
                        </Group>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Stack>
          </Paper>
        </Stack>
      </Group>
    </Stack>
  );

  const renderPracticeMode = () => (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Title order={2}>Practice Questions</Title>
        <Group>
          <Select
            placeholder="Select subject"
            data={subjects}
            value={selectedSubject}
            onChange={setSelectedSubject}
            clearable
            style={{ width: 200 }}
          />
          <Select
            placeholder="Difficulty"
            data={[
              { value: 'easy', label: 'Easy' },
              { value: 'medium', label: 'Medium' },
              { value: 'hard', label: 'Hard' },
            ]}
            value={selectedDifficulty}
            onChange={(value) => setSelectedDifficulty(value || 'medium')}
            style={{ width: 120 }}
          />
        </Group>
      </Group>

      {practiceStats.total > 0 && (
        <Paper p="md" withBorder>
          <MantineGroup justify="space-between">
            <Group>
              <ThemeIcon color="blue" size="lg" variant="light">
                <IconBrain size={20} />
              </ThemeIcon>
              <div>
                <Text size="sm" c="dimmed">Total Questions</Text>
                <Text fw={500}>{practiceStats.total}</Text>
              </div>
            </Group>
            <Group>
              <ThemeIcon color="green" size="lg" variant="light">
                <IconCheck size={20} />
              </ThemeIcon>
              <div>
                <Text size="sm" c="dimmed">Correct</Text>
                <Text fw={500}>{practiceStats.correct}</Text>
              </div>
            </Group>
            <Group>
              <ThemeIcon color="red" size="lg" variant="light">
                <IconX size={20} />
              </ThemeIcon>
              <div>
                <Text size="sm" c="dimmed">Incorrect</Text>
                <Text fw={500}>{practiceStats.incorrect}</Text>
              </div>
            </Group>
            <Group>
              <ThemeIcon color="yellow" size="lg" variant="light">
                <IconArrowRight size={20} />
              </ThemeIcon>
              <div>
                <Text size="sm" c="dimmed">Current Streak</Text>
                <Text fw={500}>{practiceStats.streak}</Text>
              </div>
            </Group>
            <Text size="sm" c="dimmed">
              Accuracy: {practiceStats.total > 0 
                ? Math.round((practiceStats.correct / practiceStats.total) * 100)
                : 0}%
            </Text>
          </MantineGroup>
        </Paper>
      )}

      <Paper p="md" withBorder>
        <Stack gap="md">
          <Text fw={500}>Generate Practice Questions</Text>
          <Textarea
            value={userInput}
            onChange={(e) => setUserInput(e.currentTarget.value)}
            placeholder="Enter the topic you want to practice..."
            minRows={3}
            disabled={isLoading}
          />
          <Group justify="flex-end">
            <Button
              leftSection={<IconListCheck size={20} />}
              onClick={handlePracticeSubmit}
              loading={isLoading}
              variant="gradient"
              gradient={{ from: 'blue', to: 'cyan' }}
            >
              Generate Questions
            </Button>
          </Group>
        </Stack>
      </Paper>

      {practiceQuestions.length > 0 && (
        <Stack gap="md">
          {practiceQuestions.map((question, index) => (
            <Paper 
              key={question.id} 
              p="md" 
              withBorder
              shadow={question.selectedAnswer ? 'sm' : 'md'}
              style={{
                transition: 'all 0.3s ease',
                transform: question.selectedAnswer ? 'scale(0.99)' : 'scale(1)',
              }}
            >
              <Stack gap="sm">
                <MantineGroup justify="space-between">
                  <MantineGroup>
                    <ThemeIcon
                      color={question.isCorrect === undefined ? 'blue' : question.isCorrect ? 'green' : 'red'}
                      variant="light"
                      size="lg"
                      style={{ transition: 'all 0.3s ease' }}
                    >
                      {question.isCorrect === undefined ? (
                        <IconArrowRight size={20} />
                      ) : question.isCorrect ? (
                        <IconCheck size={20} />
                      ) : (
                        <IconX size={20} />
                      )}
                    </ThemeIcon>
                    <Text fw={500}>Question {index + 1}</Text>
                  </MantineGroup>
                  <Badge 
                    color={
                      question.difficulty === 'easy' ? 'green' : 
                      question.difficulty === 'medium' ? 'yellow' : 
                      'red'
                    }
                  >
                    {question.difficulty}
                  </Badge>
                </MantineGroup>
                
                <Text size="lg">{question.question}</Text>

                <Radio.Group
                  value={question.selectedAnswer || ''}
                  onChange={(value: string) => handleAnswerSubmit(question.id, value)}
                >
                  <Stack gap="xs">
                    {Object.entries(question.options).map(([key, value]) => (
                      <Radio
                        key={key}
                        value={key}
                        label={`${key}) ${value}`}
                        disabled={question.selectedAnswer !== undefined}
                        color={
                          question.selectedAnswer === key
                            ? question.isCorrect
                              ? 'green'
                              : 'red'
                            : question.selectedAnswer !== undefined && key === question.correct
                            ? 'green'
                            : undefined
                        }
                        styles={{
                          radio: {
                            transition: 'all 0.3s ease',
                            transform: question.selectedAnswer === key ? 'scale(1.05)' : 'scale(1)',
                          },
                        }}
                      />
                    ))}
                  </Stack>
                </Radio.Group>

                {showExplanation[question.id] && (
                  <Paper 
                    p="sm" 
                    bg="gray.0"
                    style={{
                      animation: 'fadeIn 0.5s ease-in-out',
                    }}
                  >
                    <Stack gap="xs">
                      <Text size="sm" fw={500} c={question.isCorrect ? 'green' : 'red'}>
                        {question.isCorrect ? '✨ Correct!' : '❌ Incorrect'}
                      </Text>
                      
                      <Text size="sm" fw={500}>
                        Explanation:
                      </Text>
                      <Text size="sm">{question.explanation}</Text>
                    </Stack>
                  </Paper>
                )}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );

  return (
    <Container size="xl" py="xl">
      {currentMode === 'tutor' && renderTutorMode()}
      {currentMode === 'roadmap' && renderRoadmapMode()}
      {currentMode === 'practice' && renderPracticeMode()}
    </Container>
  );
};

export default Dashboard; 