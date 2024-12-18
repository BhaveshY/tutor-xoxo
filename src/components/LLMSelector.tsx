import React from 'react';
import { Select } from '@mantine/core';

export type LLMProvider = 'openai' | 'xai';

interface LLMSelectorProps {
  value: LLMProvider;
  onChange: (provider: LLMProvider) => void;
}

export const LLMSelector: React.FC<LLMSelectorProps> = ({ value, onChange }) => {
  return (
    <Select
      label="AI Provider"
      value={value}
      onChange={(val) => onChange(val as LLMProvider)}
      data={[
        { value: 'openai', label: 'OpenAI GPT-4' },
        { value: 'xai', label: 'xAI Grok' }
      ]}
    />
  );
}; 