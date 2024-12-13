import { supabase } from '../lib/supabase.ts';

export interface LLMResponse {
  content: string;
  error?: string;
}

export interface LLMError extends Error {
  message: string;
}

export const llmService = {
  async generateTutorResponse(prompt: string): Promise<LLMResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-tutor-response', {
        body: { prompt },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error generating tutor response:', error);
      return {
        content: '',
        error: error instanceof Error ? error.message : 'Failed to generate response. Please try again.',
      };
    }
  },

  async generateRoadmap(goals: string): Promise<LLMResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-roadmap', {
        body: { goals },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error generating roadmap:', error);
      return {
        content: '',
        error: error instanceof Error ? error.message : 'Failed to generate roadmap. Please try again.',
      };
    }
  },

  async generatePracticeQuestions(topic: string): Promise<LLMResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-practice-questions', {
        body: { topic },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error generating practice questions:', error);
      return {
        content: '',
        error: error instanceof Error ? error.message : 'Failed to generate questions. Please try again.',
      };
    }
  },
}; 