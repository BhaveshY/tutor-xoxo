import React from 'react';
import { Center, Loader, Stack, Text } from '@mantine/core';

const LoadingScreen = () => {
  return (
    <Center style={{ height: '100vh' }}>
      <Stack align="center" gap="xs">
        <Loader size="xl" type="dots" />
        <Text size="lg" fw={500}>
          Loading TutorGPT...
        </Text>
      </Stack>
    </Center>
  );
};

export default LoadingScreen; 