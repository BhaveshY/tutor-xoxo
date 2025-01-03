import React from 'react';
import { Select } from '@mantine/core';
import type { LLMProvider } from '../services/llmService.ts';

interface LLMSelectorProps {
  value: LLMProvider;
  onChange: (value: LLMProvider) => void;
}

const modelOptions = [
  { value: 'gpt-4', label: 'GPT-4 Turbo' },
  { value: 'grok-2-1212', label: 'Grok-2' },
  { value: 'claude-3', label: 'Claude 3 Opus' },
  { value: 'gemini-pro', label: 'Gemini Pro' }
];

export const LLMSelector: React.FC<LLMSelectorProps> = ({ value, onChange }) => {
  return (
    <Select
      label="AI Model"
      placeholder="Select model"
      value={value}
      onChange={(val) => onChange(val as LLMProvider)}
      data={modelOptions}
      style={{ width: 200 }}
    />
  );
}; 