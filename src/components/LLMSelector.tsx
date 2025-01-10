import React from 'react';
import { Select } from '@mantine/core';
import { LLMModel } from '../services/llmService.ts';

interface LLMSelectorProps {
  value: LLMModel;
  onChange: (value: LLMModel) => void;
  className?: string;
}

const models: { value: LLMModel; label: string }[] = [
  { value: 'openai/gpt-4-turbo-preview', label: 'GPT-4 Turbo' },
  { value: 'anthropic/claude-3-opus', label: 'Claude 3 Opus' },
  { value: 'anthropic/claude-3-sonnet', label: 'Claude 3 Sonnet' },
  { value: 'google/gemini-pro', label: 'Gemini Pro' },
  { value: 'meta-llama/llama-2-70b-chat', label: 'Llama 2 70B' },
  { value: 'mistral/mistral-medium', label: 'Mistral Medium' }
];

export const LLMSelector: React.FC<LLMSelectorProps> = ({ value, onChange, className }) => {
  return (
    <Select
      label="AI Model"
      description="Select the AI model to use"
      data={models}
      value={value}
      onChange={(value) => onChange(value as LLMModel)}
      className={className}
    />
  );
}; 