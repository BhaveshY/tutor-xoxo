import React from 'react';
import { Alert, Button, Group } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => {
  return (
    <Alert
      icon={<IconAlertCircle size={16} />}
      title="Error"
      color="red"
      variant="light"
    >
      {message}
      {onRetry && (
        <Group mt="sm">
          <Button variant="light" color="red" size="xs" onClick={onRetry}>
            Try again
          </Button>
        </Group>
      )}
    </Alert>
  );
}; 