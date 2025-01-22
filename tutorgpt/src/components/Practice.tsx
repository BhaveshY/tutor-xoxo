import React, { FC } from 'react';
import { Stack } from '@mantine/core';

interface PracticeProps {
  className?: string;
}

export const Practice: FC<PracticeProps> = ({ className }): JSX.Element => {
  return (
    <Stack className={className}>
      {/* Practice component implementation will go here */}
    </Stack>
  );
}; 