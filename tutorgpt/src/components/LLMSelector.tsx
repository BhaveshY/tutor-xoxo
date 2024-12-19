import React from 'react';
import { Select } from '@mantine/core';
import type { LLMProvider } from '../services/llmService.ts';

interface LLMSelectorProps {
  value: LLMProvider;
  onChange: (value: LLMProvider) => void;
}

export const modelLabels: Record<LLMProvider, string> = {
  'openai/gpt-4-turbo-preview': 'GPT-4 Turbo',
  'groq/grok-2-1212': 'Grok-2',
  'anthropic/claude-3-5-sonnet-20241022': 'Claude 3 Sonnet'
};

const modelOptions = Object.entries(modelLabels).map(([value, label]) => ({
  value: value as LLMProvider,
  label
}));

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