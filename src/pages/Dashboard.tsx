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
import { llmService } from '../services/llmService.ts';
import { userActivityService } from '../services/userActivityService.ts';
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

const Dashboard = () => {
  const { currentMode, user } = useStore();
  const [userInput, setUserInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [chatHistory]);

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

      // Track activity
      await userActivityService.trackActivity({
        userId: user!.id,
        type: 'chat',
        content: userInput,
        metadata: {
          subject: selectedSubject || 'General'
        }
      });

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

  return (
    <Container size="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <Title order={2}>AI Tutor</Title>
          <Select
            placeholder="Select subject"
            data={[
              'Mathematics',
              'Physics',
              'Chemistry',
              'Biology',
              'Computer Science',
              'History',
              'Literature',
              'General Knowledge',
            ]}
            value={selectedSubject}
            onChange={setSelectedSubject}
            clearable
            style={{ width: 200 }}
          />
        </Group>

        <Paper p="md" withBorder>
          <Stack gap="md">
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
                    <IconSend style={{ width: 20, height: 20 }} />
                  </ActionIcon>
                </Tooltip>
              </Stack>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
};

export default Dashboard; 