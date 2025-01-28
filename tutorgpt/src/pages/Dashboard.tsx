import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth.ts';
import { useStore } from '../store/useStore.ts';
import { llmService } from '../services/llmService.ts';
import { databaseService, LearningRoadmap } from '../services/databaseService.ts';
import { supabase } from '../lib/supabaseClient.ts';
import Progress from './Progress.tsx';
import { notifications } from '@mantine/notifications';
import { 
  ActionIcon, 
  Badge, 
  Box, 
  Button, 
  Container, 
  Divider, 
  Group as MantineGroup, 
  Paper, 
  Radio, 
  Select, 
  Stack, 
  Text, 
  Textarea, 
  ThemeIcon, 
  Title, 
  Tooltip,
  TextInput,
  Loader,
  Progress as MantineProgress,
  Checkbox,
} from '@mantine/core';
import { 
  IconArrowRight,
  IconBookmark,
  IconBrain,
  IconChartBar,
  IconCheck,
  IconListCheck,
  IconLogout,
  IconMap,
  IconRefresh,
  IconSend,
  IconX
} from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { parseRoadmapContent, calculateProgress } from './Progress.tsx';
import { Projects } from '../components/Projects.tsx';

interface RoadmapTopic {
  id: string;
  title: string;
  subtopics: RoadmapSubtopic[];
  completed: boolean;
}

interface RoadmapSubtopic {
  id: string;
  title: string;
  completed: boolean;
}

// Types
interface ChatMessage {
  role: "user" | "assistant";
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
  correct: "A" | "B" | "C" | "D";
  explanation: string;
  selectedAnswer?: string;
  isCorrect?: boolean;
  difficulty: "easy" | "medium" | "hard";
}

interface SavedRoadmap {
  id: string;
  title: string;
  content: string;
  topics: RoadmapTopic[];
  progress: number;
  timestamp: Date;
}

interface PracticeStats {
  total: number;
  correct: number;
  incorrect: number;
  streak: number;
}

type RoadmapItem = SavedRoadmap;

const Dashboard = () => {
  const {
    currentMode,
    user,
    addRoadmap,
    roadmaps,
    removeRoadmap,
    clearRoadmaps,
    setCurrentMode
  } = useStore();
  const [userInput, setUserInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [savedQuestions, setSavedQuestions] = useState<SavedQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedRoadmap, setSelectedRoadmap] = useState<SavedRoadmap | null>(
    null
  );
  const [practiceQuestions, setPracticeQuestions] = useState<PracticeQuestion[]>([]);
  const [showExplanation, setShowExplanation] = useState<
    Record<string, boolean>
  >({});
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const [practiceStats, setPracticeStats] = useState<PracticeStats>({
    total: 0,
    correct: 0,
    incorrect: 0,
    streak: 0,
  });
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [topic, setTopic] = useState('');
  const { session } = useAuth();
  const userId = session?.user?.id;

  // Load roadmaps when user logs in
  useEffect(() => {
    const loadRoadmaps = async () => {
      if (!user?.id) return;

      try {
        clearRoadmaps();
        const roadmapsData = await databaseService.getRoadmaps(user.id);
        roadmapsData.forEach((roadmap) => {
          console.log('Loading roadmap content:', roadmap.content);
          const topics = parseRoadmapContent(roadmap.content);
          console.log('Parsed topics:', topics);
          addRoadmap({
            id: roadmap.id,
            title: roadmap.title,
            content: roadmap.content,
            timestamp: new Date(roadmap.created_at),
            topics: topics,
            progress: calculateProgress(topics),
          });
        });
      } catch (error) {
        console.error("Error loading roadmaps:", error);
        notifications.show({
          title: "Error",
          message: "Failed to load roadmaps",
          color: "red",
        });
      }
    };

    loadRoadmaps();
  }, [user?.id]);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const subjects = [
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "Computer Science",
    "History",
    "Literature",
    "General Knowledge",
  ];

  const handleSubmit = async () => {
    if (!userInput.trim()) {
      notifications.show({
        title: "Error",
        message: "Please enter your question",
        color: "red",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Add user message to chat
      const userMessage: ChatMessage = {
        role: "user",
        content: userInput,
        timestamp: new Date(),
      };
      setChatHistory((prev) => [...prev, userMessage]);

      // Get AI response with chat history
      const result = await llmService.generateTutorResponse(
        `[Subject: ${selectedSubject || "General"}] ${userInput}`,
        chatHistory.map((msg) => ({ role: msg.role, content: msg.content }))
      );

      if (result.error) {
        throw new Error(result.error);
      }

      // Add AI response to chat
      const aiMessage: ChatMessage = {
        role: "assistant",
        content: result.content,
        timestamp: new Date(),
      };
      setChatHistory((prev) => [...prev, aiMessage]);

      // Clear input
      setUserInput("");

      notifications.show({
        title: "Success",
        message: "Response generated successfully",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to generate response",
        color: "red",
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
    setSavedQuestions((prev) => [...prev, newQuestion]);
    notifications.show({
      title: "Success",
      message: "Question saved successfully",
      color: "green",
    });
  };

  const handleLoadQuestion = (question: SavedQuestion) => {
    setUserInput(question.question);
  };

  const clearChat = () => {
    setChatHistory([]);
    notifications.show({
      title: "Success",
      message: "Chat history cleared",
      color: "blue",
    });
  };

  const handleRoadmapSubmit = async () => {
    if (!userInput.trim()) {
      notifications.show({
        title: "Error",
        message: "Please describe your learning goals",
        color: "red",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await llmService.generateRoadmap(userInput);
      if (result.error) {
        throw new Error(result.error);
      }

      // Process and save roadmap
      const topics = parseRoadmapContent(result.content);
      addRoadmap({
        id: Date.now().toString(),
        title: userInput,
        topics,
        content: result.content,
        progress: 0,
        timestamp: new Date(),
      });

      setUserInput("");
      notifications.show({
        title: "Success",
        message: "Roadmap generated successfully",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to generate roadmap",
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartPractice = async () => {
    if (!topic.trim()) {
      notifications.show({
        title: "Error",
        message: "Please enter a topic for practice",
        color: "red",
      });
      return;
    }

    setIsLoading(true);
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        console.log(`Attempt ${retryCount + 1} to generate practice questions...`);
        const result = await llmService.generatePracticeQuestions({
          prompt: topic,
          difficulty: selectedDifficulty as "easy" | "medium" | "hard"
        });

        if (result.error) {
          throw new Error(result.error);
        }

        console.log('Raw result:', JSON.stringify(result, null, 2));
        
        // Ensure we have a valid response
        if (!result.content) {
          throw new Error('No content in response');
        }

        // Validate the questions array
        if (!Array.isArray(result.content)) {
          console.error('Content is not an array:', result.content);
          throw new Error('Invalid response format: content is not an array');
        }

        if (result.content.length === 0) {
          throw new Error('No questions returned');
        }

        // Validate each question has required fields
        const questions = result.content.map((q: any, index: number) => {
          if (!q.id || !q.question || !q.options || !q.correct || !q.explanation) {
            console.error(`Invalid question format for question ${index + 1}:`, q);
            throw new Error(`Invalid question format for question ${index + 1}`);
          }

          // Ensure the question object has the correct structure
          return {
            id: q.id,
            question: q.question,
            options: {
              A: q.options.A,
              B: q.options.B,
              C: q.options.C,
              D: q.options.D
            },
            correct: q.correct,
            explanation: q.explanation,
            difficulty: q.difficulty || selectedDifficulty,
            selectedAnswer: undefined,
            isCorrect: undefined
          };
        });

        console.log('Validated questions:', questions);
        
        setPracticeQuestions(questions);
        setUserInput("");
        setPracticeStats({
          total: questions.length,
          correct: 0,
          incorrect: 0,
          streak: 0,
        });

        // If we get here, we've successfully processed the questions
        break;

      } catch (error) {
        console.error(`Error in attempt ${retryCount + 1}:`, error);
        
        if (retryCount === maxRetries) {
          notifications.show({
            title: "Error",
            message: "Failed to generate practice questions after multiple attempts. Please try again.",
            color: "red",
          });
          break;
        }
        
        retryCount++;
        // Wait a short time before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setIsLoading(false);
  };

  const handleAnswerSubmit = (questionId: string, selectedAnswer: string) => {
    setPracticeQuestions((prev) =>
      prev.map((q) => {
        if (q.id === questionId) {
          const isCorrect =
            selectedAnswer.toUpperCase() === q.correct.toUpperCase();

          setPracticeStats((stats) => ({
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
    setShowExplanation((prev) => ({ ...prev, [questionId]: true }));
  };

  const handleModelChange = (model: string) => {
    notifications.show({
      title: "Model Changed",
      message: `Switched to ${model}`,
      color: "blue",
    });
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      notifications.show({
        title: "Success",
        message: "Signed out successfully",
        color: "blue",
      });
    } catch (error) {
      console.error("Error signing out:", error);
      notifications.show({
        title: "Error",
        message: "Failed to sign out",
        color: "red",
      });
    }
  };

  const handleSaveRoadmap = async () => {
    try {
      if (!user?.id) {
        notifications.show({
          title: "Error",
          message: "You must be logged in to save a roadmap",
          color: "red",
        });
        return;
      }

      const newRoadmap: Omit<
        LearningRoadmap,
        "id" | "created_at" | "updated_at"
      > = {
        user_id: user.id,
        title: `Learning Roadmap - ${selectedSubject}`,
        content: chatHistory[chatHistory.length - 1].content,
      };

      const savedRoadmap = await databaseService.createRoadmap(newRoadmap);
      
      // Parse the content into topics
      const topics = parseRoadmapContent(savedRoadmap.content);
      console.log('Parsed topics for new roadmap:', topics);

      const roadmapWithTopics: SavedRoadmap = {
        id: savedRoadmap.id,
        title: savedRoadmap.title,
        content: savedRoadmap.content,
        timestamp: new Date(savedRoadmap.created_at),
        topics: topics,
        progress: calculateProgress(topics),
      };

      addRoadmap(roadmapWithTopics);
      setSelectedRoadmap(roadmapWithTopics);

      notifications.show({
        title: "Success",
        message: "Roadmap saved successfully",
        color: "green",
      });
    } catch (error) {
      console.error("Error saving roadmap:", error);
      notifications.show({
        title: "Error",
        message: "Failed to save roadmap",
        color: "red",
      });
    }
  };

  const handleRoadmapClick = (roadmap: RoadmapItem) => {
    // Parse the content into topics if not already parsed
    const topics = roadmap.topics?.length > 0 ? roadmap.topics : parseRoadmapContent(roadmap.content);
    console.log('Topics for clicked roadmap:', topics);
    
    const roadmapWithTopics: SavedRoadmap = {
      ...roadmap,
      topics: topics,
      progress: calculateProgress(topics),
    };
    setSelectedRoadmap(roadmapWithTopics);
  };

  const handleGenerateQuestions = async () => {
    if (!topic.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await llmService.generatePracticeQuestions({
        prompt: topic,
        difficulty: selectedDifficulty
      });
      
      if (response.error) {
        throw new Error(response.error);
      }

      // Parse the response content if it's a string
      const questions = typeof response.content === 'string' 
        ? JSON.parse(response.content).content 
        : response.content;

      // Update practice questions state
      setPracticeQuestions(questions.map((q: any) => ({
        ...q,
        selectedAnswer: undefined,
        isCorrect: undefined
      })));
      
      notifications.show({
        title: "Questions Generated",
        message: "Practice questions have been generated successfully.",
        color: "green"
      });
      
      setTopic('');
    } catch (error) {
      console.error('Error generating questions:', error);
      notifications.show({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to generate questions",
        color: "red"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDifficultyChange = (value: string | null) => {
    if (value === 'easy' || value === 'medium' || value === 'hard') {
      setSelectedDifficulty(value);
      setPracticeQuestions([]);
    }
  };

  const renderTutorMode = () => (
    <Stack gap="lg">
      <MantineGroup justify="space-between" align="center">
        <Title order={2}>AI Tutor</Title>
        <Select
          placeholder="Select subject"
          data={subjects}
          value={selectedSubject}
          onChange={setSelectedSubject}
          clearable
          style={{ width: 200 }}
        />
      </MantineGroup>

      <MantineGroup grow align="flex-start">
        <Stack style={{ flex: 2 }}>
          <Paper p="md" withBorder>
            <Stack gap="md">
              <MantineGroup justify="space-between">
                <Text size="lg" fw={500}>
                  Chat
                </Text>
                <Tooltip label="Clear chat">
                  <ActionIcon variant="light" onClick={clearChat}>
                    <IconRefresh size={20} />
                  </ActionIcon>
                </Tooltip>
              </MantineGroup>
              <Box
                ref={chatBoxRef}
                style={{ height: "400px", overflowY: "auto" }}
              >
                {chatHistory.map((message, index) => (
                  <Paper
                    key={index}
                    p="md"
                    mb="sm"
                    bg={message.role === "user" ? "gray.1" : "blue.1"}
                  >
                    <Text size="sm" c="dimmed" mb="xs">
                      {message.role === "user"
                        ? user?.name || "You"
                        : "AI Tutor"}{" "}
                      • {message.timestamp.toLocaleTimeString()}
                    </Text>
                    <Box className="markdown-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </Box>
                  </Paper>
                ))}
              </Box>
              {isLoading && (
                <Paper p="md" bg="blue.0">
                  <MantineGroup align="center" gap="sm">
                    <Loader size="sm" />
                    <Text size="sm">The tutor is thinking...</Text>
                  </MantineGroup>
                </Paper>
              )}
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                <Stack gap="sm">
                  <Textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.currentTarget.value)}
                    placeholder="Ask your question..."
                    minRows={3}
                    autosize
                    maxRows={5}
                    disabled={isLoading}
                  />
                  <MantineGroup justify="flex-end">
                    <Button
                      leftSection={<IconSend size={20} />}
                      onClick={handleSubmit}
                      loading={isLoading}
                      variant="gradient"
                      gradient={{ from: 'blue', to: 'cyan' }}
                    >
                      Send
                    </Button>
                  </MantineGroup>
                </Stack>
              </form>
            </Stack>
          </Paper>
        </Stack>

        <Stack style={{ flex: 1 }}>
          <Paper p="md" withBorder>
            <Stack gap="md">
              <MantineGroup justify="space-between">
                <Text fw={500}>Saved Questions</Text>
                <IconBookmark size={20} />
              </MantineGroup>
              <Divider />
              {savedQuestions.length === 0 ? (
                <MantineGroup align="center" gap="xs" py="xl">
                  <IconBookmark size={40} stroke={1.5} color="gray" />
                  <Text c="dimmed" ta="center">
                    No saved questions yet
                  </Text>
                  <Text size="sm" c="dimmed" ta="center">
                    Save questions to revisit them later
                  </Text>
                </MantineGroup>
              ) : (
                <Stack gap="xs" className="saved-questions-container">
                  {savedQuestions.map((question) => (
                    <Paper
                      key={question.id}
                      p="sm"
                      withBorder
                      className="saved-question-item"
                      onClick={() => handleLoadQuestion(question)}
                    >
                      <MantineGroup justify="space-between">
                        <Text size="sm" lineClamp={2}>
                          {question.question}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {question.timestamp.toLocaleTimeString()}
                        </Text>
                      </MantineGroup>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Stack>
          </Paper>
        </Stack>
      </MantineGroup>
    </Stack>
  );

  const renderRoadmapMode = () => (
    <Stack gap="lg">
      <MantineGroup justify="space-between" align="center">
        <Title order={2}>Learning Roadmap Generator</Title>
        <MantineGroup>
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
        </MantineGroup>
      </MantineGroup>

      <MantineGroup grow align="flex-start">
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
              <MantineGroup justify="flex-end">
                <Button
                  leftSection={<IconMap size={20} />}
                  onClick={handleRoadmapSubmit}
                  loading={isLoading}
                  variant="gradient"
                  gradient={{ from: "blue", to: "cyan" }}
                >
                  Generate Roadmap
                </Button>
              </MantineGroup>
            </Stack>
          </Paper>

          {selectedRoadmap && (
            <Paper p="md" withBorder>
              <Stack gap="md">
                <MantineGroup justify="space-between">
                  <Text size="lg" fw={500}>{selectedRoadmap.title}</Text>
                  <Badge size="lg" variant="light">
                    {selectedRoadmap.topics.length} Topics
                  </Badge>
                </MantineGroup>
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
              <MantineGroup justify="space-between">
                <Text fw={500}>Saved Roadmaps</Text>
                <IconMap size={20} />
              </MantineGroup>
              <Divider />
              {roadmaps.length === 0 ? (
                <MantineGroup align="center" gap="xs" py="xl">
                  <IconMap size={40} stroke={1.5} color="gray" />
                  <Text c="dimmed" ta="center">
                    No saved roadmaps yet
                  </Text>
                  <Text size="sm" c="dimmed" ta="center">
                    Generate your first learning roadmap to get started
                  </Text>
                </MantineGroup>
              ) : (
                <MantineGroup gap="sm">
                  {roadmaps.map((roadmap: RoadmapItem) => (
                    <Paper
                      key={roadmap.id}
                      p="sm"
                      withBorder
                      style={{
                        cursor: "pointer",
                        backgroundColor:
                          selectedRoadmap?.id === roadmap.id
                            ? "var(--mantine-color-blue-light)"
                            : undefined,
                      }}
                      onClick={() => handleRoadmapClick(roadmap)}
                    >
                      <MantineGroup gap="xs">
                        <Text size="sm" fw={500} lineClamp={2}>
                          {roadmap.title}
                        </Text>
                        <MantineGroup justify="space-between">
                          <Text size="xs" c="dimmed">
                            {roadmap.timestamp instanceof Date
                              ? roadmap.timestamp.toLocaleDateString()
                              : new Date(
                                  roadmap.timestamp
                                ).toLocaleDateString()}
                          </Text>
                          <Badge size="sm" variant="light">
                            {
                              roadmap.content
                                .split("\n")
                                // .filter(((line: string)) => line.trim().startsWith("- "))
                                .filter((line: string) =>
                                  line.trim().startsWith("- ")
                                ).length
                            }{" "}
                            steps
                          </Badge>
                          {/* <ActionIcon
                            variant="light"
                            onClick={() => {
                              setSelectedRoadmap(null);
                              removeRoadmap(roadmap.id);
                              notifications.show({
                                title: "Success",
                                message: "Roadmap deleted successfully",
                                color: "green",
                              });
                            }}
                          >
                            <IconTrash size={20} />
                          </ActionIcon> */}
                        </MantineGroup>
                      </MantineGroup>
                    </Paper>
                  ))}
                </MantineGroup>
              )}
            </Stack>
          </Paper>
        </Stack>
      </MantineGroup>
    </Stack>
  );

  const renderPracticeMode = () => (
    <Stack>
      <Paper p="md" withBorder>
        <form onSubmit={(e) => { e.preventDefault(); handleGenerateQuestions(); }}>
          <Stack gap="md">
            <TextInput
              label="Topic"
              value={topic}
              onChange={(e) => setTopic(e.currentTarget.value)}
              placeholder="Enter a topic to generate practice questions..."
              disabled={isLoading}
            />
            <Select
              label="Difficulty"
              data={[
                { value: 'easy', label: 'Easy' },
                { value: 'medium', label: 'Medium' },
                { value: 'hard', label: 'Hard' },
              ]}
              value={selectedDifficulty}
              onChange={handleDifficultyChange}
              style={{ width: 120 }}
            />
            <Button
              type="submit"
              loading={isLoading}
              disabled={!topic.trim()}
              fullWidth
            >
              Generate Questions
            </Button>
          </Stack>
        </form>
      </Paper>

      {practiceQuestions.length > 0 && (
        <Paper p="md" withBorder>
          <Stack gap="lg">
            <MantineGroup justify="space-between">
              <Text size="lg" fw={500}>Practice Questions</Text>
              <MantineGroup>
                <Badge color="blue">
                  {practiceStats.correct} Correct
                </Badge>
                <Badge color="red">
                  {practiceStats.incorrect} Incorrect
                </Badge>
                <Badge color="yellow">
                  Streak: {practiceStats.streak}
                </Badge>
              </MantineGroup>
            </MantineGroup>

            {practiceQuestions.map((question, index) => (
              <Paper key={question.id} p="md" withBorder>
                <Stack gap="md">
                  <MantineGroup>
                    <Badge>Question {index + 1}</Badge>
                    {question.isCorrect !== undefined && (
                      <Badge color={question.isCorrect ? 'green' : 'red'}>
                        {question.isCorrect ? 'Correct' : 'Incorrect'}
                      </Badge>
                    )}
                  </MantineGroup>

                  <Text fw={500}>{question.question}</Text>

                  <Stack gap="xs">
                    {Object.entries(question.options).map(([key, value]) => (
                      <Button
                        key={key}
                        variant={
                          question.selectedAnswer === key
                            ? question.isCorrect !== undefined
                              ? question.isCorrect
                                ? 'filled'
                                : 'filled'
                              : 'filled'
                            : 'light'
                        }
                        color={
                          question.selectedAnswer === key
                            ? question.isCorrect !== undefined
                              ? question.isCorrect
                                ? 'green'
                                : 'red'
                              : 'blue'
                            : 'gray'
                        }
                        onClick={() => {
                          if (question.isCorrect !== undefined) return; // Prevent changing answer after submission
                          const updatedQuestions = practiceQuestions.map(q =>
                            q.id === question.id
                              ? { ...q, selectedAnswer: key }
                              : q
                          );
                          setPracticeQuestions(updatedQuestions);
                        }}
                        fullWidth
                        justify="start"
                        styles={{
                          inner: {
                            justifyContent: 'flex-start',
                          },
                        }}
                      >
                        <MantineGroup gap="md">
                          <Text fw={500}>{key}.</Text>
                          <Text>{value}</Text>
                        </MantineGroup>
                      </Button>
                    ))}
                  </Stack>

                  {question.selectedAnswer && question.isCorrect !== undefined && (
                    <Paper p="sm" bg={question.isCorrect ? 'green.1' : 'red.1'}>
                      <Stack gap="xs">
                        <Text fw={500}>
                          {question.isCorrect ? 'Correct!' : 'Incorrect'}
                        </Text>
                        <Text size="sm">{question.explanation}</Text>
                      </Stack>
                    </Paper>
                  )}

                  {question.selectedAnswer && question.isCorrect === undefined && (
                    <Button
                      onClick={() => {
                        const isCorrect = question.selectedAnswer === question.correct;
                        const updatedQuestions = practiceQuestions.map(q =>
                          q.id === question.id
                            ? { ...q, isCorrect }
                            : q
                        );
                        setPracticeQuestions(updatedQuestions);

                        // Update practice stats
                        setPracticeStats(prev => ({
                          total: prev.total + 1,
                          correct: prev.correct + (isCorrect ? 1 : 0),
                          incorrect: prev.incorrect + (isCorrect ? 0 : 1),
                          streak: isCorrect ? prev.streak + 1 : 0,
                        }));
                      }}
                    >
                      Check Answer
                    </Button>
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Paper>
      )}
    </Stack>
  );

  const renderProgressMode = () => (
    <Stack>
      <Title order={2}>Learning Progress</Title>
      <Text color="dimmed" mb="xl">
        Track your learning journey and achievements.
      </Text>
      <Progress />
    </Stack>
  );

  return (
    <Container size="xl" py="xl">
      <Stack gap="md">
        {currentMode === 'tutor' && renderTutorMode()}
        {currentMode === 'roadmap' && renderRoadmapMode()}
        {currentMode === 'practice' && renderPracticeMode()}
        {currentMode === 'progress' && renderProgressMode()}
        {currentMode === 'projects' && <Projects />}
      </Stack>
    </Container>
  );
};

export default Dashboard;
