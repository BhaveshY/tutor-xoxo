import React from 'react';
import { Container, Paper, Text, Textarea, Button, Stack, LoadingOverlay } from '@mantine/core';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import useStore from '../store/useStore.ts';
import { Editor } from '@monaco-editor/react';
import { llmService } from '../services/llmService.ts';
import '../styles/markdown.css';
const Dashboard = () => {
  const { currentMode } = useStore();
  const [userInput, setUserInput] = useState('');
  const [response, setResponse] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!userInput.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Please enter your question or topic',
        color: 'red',
      });
      return;
    }

    setIsLoading(true);
    try {
      let result;
      switch (currentMode) {
        case 'tutor':
          result = await llmService.generateTutorResponse(userInput);
          break;
        case 'roadmap':
          result = await llmService.generateRoadmap(userInput);
          if (!result.error) {
            setEditorContent(result.content);
          }
          break;
        case 'practice':
          result = await llmService.generatePracticeQuestions(userInput);
          break;
        default:
          throw new Error('Invalid mode');
      }

      if (result.error) {
        throw new Error(result.error);
      }

      setResponse(result.content);
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
  const renderTutorMode = () => (
    <Stack gap="md">
      <Text size="xl">Ask your question</Text>
      <Textarea
        value={userInput}
        onChange={(e) => setUserInput(e.currentTarget.value)}
        placeholder="What would you like to learn about?"
        minRows={4}
        disabled={isLoading}
      />
      <Button onClick={handleSubmit} loading={isLoading}>Submit</Button>
      {response && (
        <Paper p="md" withBorder className="markdown-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {response}
          </ReactMarkdown>
        </Paper>
      )}
    </Stack>
  );

  const renderRoadmapMode = () => (
    <Stack gap="md">
      <Text size="xl">Create Learning Roadmap</Text>
      <Editor
        height="400px"
        defaultLanguage="markdown"
        value={editorContent}
        onChange={(value) => setEditorContent(value || '')}
        theme="vs-dark"
        options={{ readOnly: isLoading }}
      />
      <Textarea
        value={userInput}
        onChange={(e) => setUserInput(e.currentTarget.value)}
        placeholder="Describe your learning goals..."
        minRows={3}
        disabled={isLoading}
      />
      <Button onClick={handleSubmit} loading={isLoading}>Generate Roadmap</Button>
    </Stack>
  );

  const renderPracticeMode = () => (
    <Stack gap="md">
      <Text size="xl">Practice Questions</Text>
      <Textarea
        value={userInput}
        onChange={(e) => setUserInput(e.currentTarget.value)}
        placeholder="Enter the topic you want to practice..."
        minRows={2}
        disabled={isLoading}
      />
      <Button onClick={handleSubmit} loading={isLoading}>Generate Questions</Button>
      {response && (
        <Paper p="md" withBorder className="markdown-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {response}
          </ReactMarkdown>
        </Paper>
      )}
    </Stack>
  );

  const renderContent = () => {
    switch (currentMode) {
      case 'tutor':
        return renderTutorMode();
      case 'roadmap':
        return renderRoadmapMode();
      case 'practice':
        return renderPracticeMode();
      default:
        return <Text>Select a mode to begin</Text>;
    }
  };

  return (
    <Container size="lg" pos="relative">
      <LoadingOverlay visible={isLoading} />
      {renderContent()}
    </Container>
  );
};

export default Dashboard; 