import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export type LLMProvider = 'gpt-4-turbo-preview' | 'grok-2-1212' | 'claude-3-5-sonnet-20241022' | 'gemini-pro';

interface LLMResponse {
  content: string;
  error?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

type PracticeParams = {
  prompt: string;
  difficulty: 'easy' | 'medium' | 'hard';
  provider?: LLMProvider;
};

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const llmService = {
  generateTutorResponse: async (prompt: string, chatHistory: ChatMessage[] = [], provider: LLMProvider = 'gpt-4-turbo-preview'): Promise<LLMResponse> => {
    try {
      const { data, error } = await supabase.functions.invoke<LLMResponse>('tutor', {
        body: { 
          prompt,
          chatHistory,
          model: provider,
          subject: prompt.match(/\[Subject: (.+?)\]/)?.[1] || 'General'
        },
      });

      if (error) throw error;
      return data || { content: '', error: 'No response data' };
    } catch (error) {
      console.error('Error generating tutor response:', error);
      return { error: error instanceof Error ? error.message : 'An unknown error occurred', content: '' };
    }
  },

  generateRoadmap: async (prompt: string, provider: LLMProvider = 'gpt-4-turbo-preview'): Promise<LLMResponse> => {
    try {
      const { data, error } = await supabase.functions.invoke<LLMResponse>('roadmap', {
        body: { prompt, model: provider },
      });

      if (error) throw error;
      return data || { content: '', error: 'No response data' };
    } catch (error) {
      console.error('Error generating roadmap:', error);
      return { error: error instanceof Error ? error.message : 'An unknown error occurred', content: '' };
    }
  },

  generatePracticeQuestions: async ({ prompt, difficulty, provider = 'gpt-4-turbo-preview' }: PracticeParams): Promise<LLMResponse> => {
    try {
      const { data, error } = await supabase.functions.invoke<{ content: string }>('practice', {
        body: { prompt, difficulty, model: provider },
      });

      if (error) throw error;
      return { content: data?.content || '' };
    } catch (error) {
      console.error('Error generating practice questions:', error);
      return { error: error instanceof Error ? error.message : 'An unknown error occurred', content: '' };
    }
  },
}; 