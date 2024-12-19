import React from 'react';
import { Select } from '@mantine/core';
import type { LLMProvider } from '../services/llmService.ts';

interface LLMSelectorProps {
  value: LLMProvider;
  onChange: (value: LLMProvider) => void;
}

const modelOptions = [
  { value: 'gpt-4-turbo-preview', label: 'GPT-4 Turbo' },
  { value: 'grok-2-1212', label: 'Grok-2' },
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3 Sonnet' },
  { value: 'gemini-pro', label: 'Gemini Pro' }
] as const;

export const LLMSelector: React.FC<LLMSelectorProps> = ({ value, onChange }) => {
  return (
    <Select
      label="AI Model"
      placeholder="Select model"
      value={value}
      onChange={(val) => val && onChange(val as LLMProvider)}
      data={modelOptions}
      style={{ width: 200 }}
    />
  );
}; 