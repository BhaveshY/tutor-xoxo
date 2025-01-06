import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth.ts';
import useStore from '../store/useStore.ts';
import { llmService, LLMProvider } from '../services/llmService.ts';
import { databaseService, LearningRoadmap } from '../services/databaseService.ts';
import { supabase } from '../lib/supabaseClient.ts';
import { Projects } from '../components/Projects.tsx';
import Progress from './Progress.tsx';
import { LLMSelector } from '../components/LLMSelector.tsx';
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
  Tooltip 
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
  timestamp: Date;
  topics: RoadmapTopic[];
  progress: number;
}

interface PracticeStats {
  total: number;
  correct: number;
  incorrect: number;
  streak: number;
}

type RoadmapItem = SavedRoadmap;

const parseRoadmapContent = (content: string): RoadmapTopic[] => {
  const lines = content.split("\n");
  const topics: RoadmapTopic[] = [];
  let currentTopic: RoadmapTopic | null = null;

  lines.forEach((line) => {
    if (line.startsWith("## Milestone")) {
      if (currentTopic) {
        topics.push(currentTopic);
      }
      const title =
        line.replace("## Milestone", "").trim().split(":")[1]?.trim() ||
        "Untitled";
      currentTopic = {
        id: Date.now().toString() + Math.random(),
        title,
        subtopics: [],
        completed: false,
      };
    } else if (line.startsWith("- ") && currentTopic) {
      const title = line.replace("- ", "").trim();
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

const getModelLabel = (model: LLMProvider): string => {
  switch (model) {
    case "openai/gpt-4-turbo-preview":
      return "GPT-4 Turbo";
    case "groq/grok-2-1212":
      return "Grok-2";
    case "anthropic/claude-3-5-sonnet-20241022":
      return "Claude 3 Sonnet";
    default:
      return "Unknown Model";
  }
};

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
  const [practiceQuestions, setPracticeQuestions] = useState<
    PracticeQuestion[]
  >([]);
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
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('medium');
  const [selectedModel, setSelectedModel] = useState<LLMProvider>('openai/gpt-4-turbo-preview');

  // Load roadmaps when user logs in
  useEffect(() => {
    const loadRoadmaps = async () => {
      if (!user?.id) return;

      try {
        // clearRoadmaps();
        const roadmapsData = await databaseService.getRoadmaps(user.id);
        roadmapsData.forEach((roadmap) => {
          addRoadmap({
            id: roadmap.id,
            title: roadmap.title,
            content: roadmap.content,
            timestamp: new Date(roadmap.created_at),
            topics: [],
            progress: 0,
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
  }, [
    user?.id,
    addRoadmap,
    // clearRoadmaps
  ]);

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
        chatHistory.map((msg) => ({ role: msg.role, content: msg.content })),
        selectedModel
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
      const result = await llmService.generateRoadmap(userInput, selectedModel);
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
    if (!userInput.trim()) {
      notifications.show({
        title: "Error",
        message: "Please enter a topic for practice",
        color: "red",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await llmService.generatePracticeQuestions({
        prompt: userInput,
        difficulty: selectedDifficulty as "easy" | "medium" | "hard",
        provider: selectedModel,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      const questions = JSON.parse(result.content);
      setPracticeQuestions(questions);
      setUserInput("");
      setPracticeStats({
        total: questions.length,
        correct: 0,
        incorrect: 0,
        streak: 0,
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to generate practice questions",
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
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

  const handleModelChange = (model: LLMProvider) => {
    setSelectedModel(model);
    notifications.show({
      title: "Model Changed",
      message: `Switched to ${getModelLabel(model)}`,
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
        provider: selectedModel,
      };

      const savedRoadmap = await databaseService.createRoadmap(newRoadmap);

      const roadmapWithTopics: SavedRoadmap = {
        id: savedRoadmap.id,
        title: savedRoadmap.title,
        content: savedRoadmap.content,
        timestamp: new Date(savedRoadmap.created_at),
        topics: [],
        progress: 0,
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
    const roadmapWithTopics: SavedRoadmap = {
      ...roadmap,
      topics: roadmap.topics || [],
      progress: roadmap.progress || 0,
    };
    setSelectedRoadmap(roadmapWithTopics);
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
    <Stack gap="lg">
      <MantineGroup justify="space-between" align="center">
        <Title order={2}>Practice Questions</Title>
        <MantineGroup>
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
              { value: "easy", label: "Easy" },
              { value: "medium", label: "Medium" },
              { value: "hard", label: "Hard" },
            ]}
            value={selectedDifficulty}
            onChange={(value) => setSelectedDifficulty(value || "medium")}
            style={{ width: 120 }}
          />
        </MantineGroup>
      </MantineGroup>

      {practiceStats.total > 0 && (
        <Paper p="md" withBorder>
          <MantineGroup justify="space-between">
            <MantineGroup>
              <ThemeIcon color="blue" size="lg" variant="light">
                <IconBrain size={20} />
              </ThemeIcon>
              <div>
                <Text size="sm" c="dimmed">
                  Total Questions
                </Text>
                <Text fw={500}>{practiceStats.total}</Text>
              </div>
            </MantineGroup>
            <MantineGroup>
              <ThemeIcon color="green" size="lg" variant="light">
                <IconCheck size={20} />
              </ThemeIcon>
              <div>
                <Text size="sm" c="dimmed">
                  Correct
                </Text>
                <Text fw={500}>{practiceStats.correct}</Text>
              </div>
            </MantineGroup>
            <MantineGroup>
              <ThemeIcon color="red" size="lg" variant="light">
                <IconX size={20} />
              </ThemeIcon>
              <div>
                <Text size="sm" c="dimmed">
                  Incorrect
                </Text>
                <Text fw={500}>{practiceStats.incorrect}</Text>
              </div>
            </MantineGroup>
            <MantineGroup>
              <ThemeIcon color="yellow" size="lg" variant="light">
                <IconArrowRight size={20} />
              </ThemeIcon>
              <div>
                <Text size="sm" c="dimmed">
                  Current Streak
                </Text>
                <Text fw={500}>{practiceStats.streak}</Text>
              </div>
            </MantineGroup>
            <Text size="sm" c="dimmed">
              Accuracy:{" "}
              {practiceStats.total > 0
                ? Math.round(
                    (practiceStats.correct / practiceStats.total) * 100
                  )
                : 0}
              %
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
          <MantineGroup justify="flex-end">
            <Button
              leftSection={<IconListCheck size={20} />}
              onClick={handleStartPractice}
              loading={isLoading}
              variant="gradient"
              gradient={{ from: "blue", to: "cyan" }}
            >
              Generate Questions
            </Button>
          </MantineGroup>
        </Stack>
      </Paper>

      {practiceQuestions.length > 0 && (
        <Stack gap="md">
          {practiceQuestions.map((question, index) => (
            <Paper
              key={question.id}
              p="md"
              withBorder
              shadow={question.selectedAnswer ? "sm" : "md"}
              style={{
                transition: "all 0.3s ease",
                transform: question.selectedAnswer ? "scale(0.99)" : "scale(1)",
              }}
            >
              <Stack gap="sm">
                <MantineGroup justify="space-between">
                  <MantineGroup>
                    <ThemeIcon
                      color={
                        question.isCorrect === undefined
                          ? "blue"
                          : question.isCorrect
                          ? "green"
                          : "red"
                      }
                      variant="light"
                      size="lg"
                      style={{ transition: "all 0.3s ease" }}
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
                      question.difficulty === "easy"
                        ? "green"
                        : question.difficulty === "medium"
                        ? "yellow"
                        : "red"
                    }
                  >
                    {question.difficulty}
                  </Badge>
                </MantineGroup>

                <Text size="lg">{question.question}</Text>

                <Radio.Group
                  value={question.selectedAnswer || ""}
                  onChange={(value: string) =>
                    handleAnswerSubmit(question.id, value)
                  }
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
                              ? "green"
                              : "red"
                            : question.selectedAnswer !== undefined &&
                              key === question.correct
                            ? "green"
                            : undefined
                        }
                        styles={{
                          radio: {
                            transition: "all 0.3s ease",
                            transform:
                              question.selectedAnswer === key
                                ? "scale(1.05)"
                                : "scale(1)",
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
                      animation: "fadeIn 0.5s ease-in-out",
                    }}
                  >
                    <Stack gap="xs">
                      <Text
                        size="sm"
                        fw={500}
                        c={question.isCorrect ? "green" : "red"}
                      >
                        {question.isCorrect ? "✨ Correct!" : "❌ Incorrect"}
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

  const renderProgressMode = () => (
    <Stack>
      <Title order={2}>Learning Progress</Title>
      <Text color="dimmed" mb="xl">
        Track your learning journey and achievements.
      </Text>
      <Progress />
    </Stack>
  );

  const renderProjectsMode = () => (
    <Stack>
      <Title order={2}>Project Suggestions</Title>
      <Text color="dimmed" mb="xl">
        Get personalized project suggestions based on your learning roadmaps or specific topics.
      </Text>
      <Projects provider={selectedModel} />
    </Stack>
  );

  return (
    <Container size="xl" p="md">
      {currentMode === 'tutor' && renderTutorMode()}
      {currentMode === 'roadmap' && renderRoadmapMode()}
      {currentMode === 'practice' && renderPracticeMode()}
      {currentMode === 'progress' && renderProgressMode()}
      {currentMode === 'projects' && renderProjectsMode()}
    </Container>
  );
};

export default Dashboard;
