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
      console.log('Submitting practice question request for:', userInput);
      const result = await llmService.generatePracticeQuestions(userInput);
      
      if (result.error) {
        console.error('API Error:', result.error);
        throw new Error(result.error);
      }

      console.log('Received response:', result.content);

      // Parse the questions with support for both formats
      const rawQuestions = result.content.split('\n\n').filter((q: string) => q.trim().startsWith('Q'));
      console.log(`Found ${rawQuestions.length} raw questions`);

      const questions = rawQuestions.map((q: string, index: number) => {
        try {
          const lines = q.split('\n').filter((line: string) => line.trim());
          console.log(`Question ${index + 1} has ${lines.length} lines:`, lines);

          const question = lines[0].replace(/^Q\d+:\s*/, '').trim();
          
          // Check if we're dealing with the "Answer:" format
          const isAnswerFormat = lines.some((line: string) => line.startsWith('Answer:'));
          
          let options: { A: string; B: string; C: string; D: string };
          let correct: 'A' | 'B' | 'C' | 'D';
          let explanation = '';

          if (isAnswerFormat) {
            // Convert Answer format to multiple choice
            const answerLine = lines.find((line: string) => line.startsWith('Answer:'));
            const correctAnswer = answerLine?.replace(/^Answer:\s*/, '').trim() || '';
            
            const explanationLine = lines.find((line: string) => line.startsWith('Explanation:'));
            explanation = explanationLine?.replace(/^Explanation:\s*/, '').trim() || 'No explanation provided';

            // Generate plausible wrong answers based on the correct answer
            const wrongAnswers = generateWrongAnswers(correctAnswer, question);
            
            // Randomly place the correct answer
            const optionIndex = Math.floor(Math.random() * 4);
            const optionsArray = [...wrongAnswers];
            optionIndex === 0 ? optionsArray.unshift(correctAnswer) : optionsArray.splice(optionIndex, 0, correctAnswer);
            
            options = {
              A: optionsArray[0],
              B: optionsArray[1],
              C: optionsArray[2],
              D: optionsArray[3],
            };
            
            correct = ['A', 'B', 'C', 'D'][optionIndex] as 'A' | 'B' | 'C' | 'D';
          } else {
            // Handle standard multiple choice format
            if (!lines[1]?.startsWith('A)') || !lines[2]?.startsWith('B)') || 
                !lines[3]?.startsWith('C)') || !lines[4]?.startsWith('D)')) {
              console.error(`Question ${index + 1} has invalid option format`);
              return null;
            }

            options = {
              A: lines[1].replace(/^A\)\s*/, '').trim(),
              B: lines[2].replace(/^B\)\s*/, '').trim(),
              C: lines[3].replace(/^C\)\s*/, '').trim(),
              D: lines[4].replace(/^D\)\s*/, '').trim(),
            };

            const correctLine = lines[5]?.trim() || '';
            if (!correctLine.startsWith('Correct:')) {
              console.error(`Question ${index + 1} has invalid correct answer format:`, correctLine);
              return null;
            }

            correct = correctLine.replace(/^Correct:\s*/, '').trim() as 'A' | 'B' | 'C' | 'D';
            if (!['A', 'B', 'C', 'D'].includes(correct)) {
              console.error(`Question ${index + 1} has invalid correct answer value:`, correct);
              return null;
            }

            const explanationLine = lines[6]?.trim() || '';
            explanation = explanationLine.replace(/^Explanation:\s*/, '').trim() || 'No explanation provided';
          }

          const parsedQuestion = {
            id: Date.now().toString() + Math.random(),
            question,
            options,
            correct,
            explanation,
            difficulty: selectedDifficulty as 'easy' | 'medium' | 'hard',
          };

          console.log(`Successfully parsed question ${index + 1}:`, parsedQuestion);
          return parsedQuestion;
        } catch (err) {
          console.error(`Error parsing question ${index + 1}:`, err);
          console.error('Question content:', q);
          return null;
        }
      }).filter(Boolean) as PracticeQuestion[];

      console.log('Final parsed questions:', questions);

      if (questions.length === 0) {
        throw new Error('Failed to parse questions. Please try again.');
      }

      setPracticeQuestions(questions);
      setUserInput('');

      notifications.show({
        title: 'Success',
        message: 'Practice questions generated successfully',
        color: 'green',
      });
    } catch (error) {
      console.error('Practice question generation error:', error);
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to generate questions',
        color: 'red',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced wrong answer generation
  const generateWrongAnswers = (correctAnswer: string, question: string): string[] => {
    const wrongAnswers: string[] = [];
    
    // For NLP-related questions
    if (question.toLowerCase().includes('nlp')) {
      wrongAnswers.push(
        'Natural Language Programming',
        'Neural Language Processing',
        'Network Language Protocol',
        'Natural Learning Process',
        'Nested Language Protocol',
        'Neural Learning Platform'
      );
    } 
    // For programming-related questions
    else if (question.toLowerCase().includes('programming') || 
             question.toLowerCase().includes('code') ||
             question.toLowerCase().includes('developer')) {
      wrongAnswers.push(
        'JavaScript',
        'Python',
        'Java',
        'C++',
        'Ruby',
        'TypeScript'
      );
    }
    // For definition questions
    else if (question.toLowerCase().startsWith('what is') || 
             question.toLowerCase().startsWith('define')) {
      wrongAnswers.push(
        `A different concept than ${correctAnswer}`,
        `The opposite of ${correctAnswer}`,
        `Similar but not the same as ${correctAnswer}`,
        `A common misconception about ${correctAnswer}`,
        `An outdated definition of ${correctAnswer}`,
        `An incomplete understanding of ${correctAnswer}`
      );
    }
    // For technical questions
    else if (question.toLowerCase().includes('technical') || 
             question.toLowerCase().includes('technology')) {
      wrongAnswers.push(
        'A hardware component',
        'A software application',
        'A network protocol',
        'A database system',
        'An operating system feature',
        'A cloud service'
      );
    }
    // Default case
    else {
      wrongAnswers.push(
        `Not ${correctAnswer}`,
        `Similar to ${correctAnswer}`,
        `Opposite of ${correctAnswer}`,
        `Alternative to ${correctAnswer}`,
        `Variation of ${correctAnswer}`,
        `Related but different from ${correctAnswer}`
      );
    }
    
    // Shuffle and return 3 wrong answers
    return wrongAnswers
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
  };

  const handleAnswerSubmit = (questionId: string, selectedAnswer: string) => {
    setPracticeQuestions(prev =>
      prev.map(q => {
        if (q.id === questionId) {
          // Convert both to uppercase for case-insensitive comparison
          const isCorrect = selectedAnswer.toUpperCase() === q.correct.toUpperCase();
          console.log('Answer check:', { 
            selected: selectedAnswer, 
            correct: q.correct, 
            isCorrect 
          });
          
          // Update stats
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
              <Box style={{ height: '400px', overflowY: 'auto' }}>
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
        <Badge size="lg" variant="light">
          {roadmaps.length} Saved Roadmaps
        </Badge>
      </Group>

      <Group grow align="flex-start">
        <Stack style={{ flex: 2 }}>
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Text fw={500}>Describe Your Learning Goals</Text>
              <Textarea
                value={userInput}
                onChange={(e) => setUserInput(e.currentTarget.value)}
                placeholder="What do you want to learn? Be specific about your goals and current level..."
                minRows={4}
                disabled={isLoading}
              />
              <Group justify="flex-end">
                <Button
                  leftSection={<IconMap size={20} />}
                  onClick={handleRoadmapSubmit}
                  loading={isLoading}
                >
                  Generate Roadmap
                </Button>
              </Group>
            </Stack>
          </Paper>

          {selectedRoadmap && (
            <Paper p="md" withBorder>
              <Stack gap="md">
                <Group justify="space-between">
                  <Text fw={500}>{selectedRoadmap.title}</Text>
                  <Text size="sm" c="dimmed">
                    {selectedRoadmap.timestamp.toLocaleDateString()}
                  </Text>
                </Group>
                <Box className="markdown-content">
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
                <Text c="dimmed" ta="center" py="xl">
                  No saved roadmaps yet
                </Text>
              ) : (
                roadmaps.map((roadmap) => (
                  <Paper
                    key={roadmap.id}
                    p="xs"
                    withBorder
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedRoadmap(roadmap)}
                  >
                    <Text size="sm" lineClamp={2}>
                      {roadmap.title}
                    </Text>
                    <Text size="xs" c="dimmed" mt={4}>
                      {roadmap.timestamp.toLocaleDateString()}
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

      {/* Stats Display */}
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