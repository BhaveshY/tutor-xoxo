import React, { useState } from "react";
import { notifications } from "@mantine/notifications";
import { Container, Stack, Title, Text } from "@mantine/core";
import { llmService } from "../services/llmService.ts";
import useStore from "../store/useStore.ts";
import { Evaluation } from "../components/Evaluation.tsx";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
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
  difficulty: "easy" | "medium" | "hard";
}

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
  const [selectedDifficulty, setSelectedDifficulty] = useState("easy");
  const [practiceQuestions, setPracticeQuestions] = useState<PracticeQuestion[]>([]);
  const [practiceStats, setPracticeStats] = useState({
    total: 0,
    correct: 0,
    incorrect: 0,
    streak: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

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
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        console.log(`Attempt ${retryCount + 1} to generate practice questions...`);
        console.log('User input:', userInput);
        console.log('Selected difficulty:', selectedDifficulty);
        
        const result = await llmService.generatePracticeQuestions({
          prompt: userInput,
          difficulty: selectedDifficulty as "easy" | "medium" | "hard",
        });

        console.log('Raw result from llmService:', result);

        if (result.error) {
          console.error('Error from llmService:', result.error);
          throw new Error(result.error);
        }

        // Ensure we have a valid response
        if (!result.content) {
          console.error('No content in response:', result);
          throw new Error('No content in response');
        }

        // Validate the questions array
        if (!Array.isArray(result.content)) {
          console.error('Content is not an array:', result.content);
          throw new Error('Invalid response format: content is not an array');
        }

        if (result.content.length === 0) {
          console.error('No questions returned');
          throw new Error('No questions returned');
        }

        // Set practice questions directly since they're already validated
        console.log('Setting practice questions:', result.content);
        setPracticeQuestions(result.content);
        setUserInput("");
        setPracticeStats({
          total: result.content.length,
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

  const renderTutorMode = () => (
    <Stack>
      <Title order={2}>AI Tutor</Title>
      <Text color="dimmed" mb="xl">
        Chat with your AI tutor.
      </Text>
      {/* Tutor content */}
    </Stack>
  );

  const renderRoadmapMode = () => (
    <Stack>
      <Title order={2}>Learning Roadmap</Title>
      <Text color="dimmed" mb="xl">
        Create and view your learning roadmaps.
      </Text>
      {/* Roadmap content */}
    </Stack>
  );

  const renderPracticeMode = () => (
    <Stack>
      <Title order={2}>Practice</Title>
      <Text color="dimmed" mb="xl">
        Practice what you've learned.
      </Text>
      {/* Practice content */}
    </Stack>
  );

  const renderProgressMode = () => (
    <Stack>
      <Title order={2}>Progress</Title>
      <Text color="dimmed" mb="xl">
        Track your learning progress.
      </Text>
      {/* Progress content */}
    </Stack>
  );

  const renderProjectsMode = () => (
    <Stack>
      <Title order={2}>Projects</Title>
      <Text color="dimmed" mb="xl">
        Work on learning projects.
      </Text>
      {/* Projects content */}
    </Stack>
  );

  const renderEvaluationMode = () => (
    <Stack>
      <Title order={2}>Learning Evaluation</Title>
      <Text color="dimmed" mb="xl">
        View your learning progress evaluation and recommendations.
      </Text>
      <Evaluation />
    </Stack>
  );

  return (
    <Container size="xl" py="xl">
      <Stack gap="md">
        {currentMode === 'tutor' && renderTutorMode()}
        {currentMode === 'roadmap' && renderRoadmapMode()}
        {currentMode === 'practice' && renderPracticeMode()}
        {currentMode === 'progress' && renderProgressMode()}
        {currentMode === 'projects' && renderProjectsMode()}
        {currentMode === 'evaluation' && renderEvaluationMode()}
      </Stack>
    </Container>
  );
};

export default Dashboard;