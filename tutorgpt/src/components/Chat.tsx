import React, { FC } from 'react';
import { Stack } from '@mantine/core';

interface ChatProps {
  className?: string;
}

export const Chat: FC<ChatProps> = ({ className }): JSX.Element => {
  return (
    <Stack className={className}>
      {/* Chat component implementation will go here */}
    </Stack>
  );
}; 