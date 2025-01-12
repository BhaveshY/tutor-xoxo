import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export type LLMProvider = 
  | 'openai/gpt-4-turbo-preview'
  | 'anthropic/claude-3-opus'
  | 'anthropic/claude-3-sonnet'
  | 'google/gemini-pro'
  | 'meta-llama/llama-2-70b-chat'
  | 'mistral/mistral-medium';

interface LLMResponse {
  content: any;
  error?: string;
  metadata?: {
    count?: number;
    difficulty?: string;
    provider?: string;
  };
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

interface PracticeQuestion {
  id: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct: "A" | "B" | "C" | "D";
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
}

interface PracticeResponse extends LLMResponse {
  content: PracticeQuestion[];
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const llmService = {
  generateTutorResponse: async (prompt: string, chatHistory: ChatMessage[] = [], provider: LLMProvider = 'openai/gpt-4-turbo-preview'): Promise<LLMResponse> => {
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

  generateRoadmap: async (prompt: string, provider: LLMProvider = 'openai/gpt-4-turbo-preview'): Promise<LLMResponse> => {
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

  generatePracticeQuestions: async ({ prompt, difficulty, provider = 'openai/gpt-4-turbo-preview' }: PracticeParams): Promise<PracticeResponse> => {
    try {
      const { data, error } = await supabase.functions.invoke<{ 
        content: PracticeQuestion[];
        metadata: {
          count: number;
          difficulty: string;
          provider: string;
        };
      }>('practice', {
        body: { prompt, difficulty, model: provider },
      });

      if (error) throw error;

      console.log('Received data from practice function:', JSON.stringify(data, null, 2));

      if (!data?.content || !Array.isArray(data.content)) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response format: content is not an array');
      }

      return { 
        content: data.content,
        metadata: data.metadata
      };
    } catch (error) {
      console.error('Error generating practice questions:', error);
      return { error: error instanceof Error ? error.message : 'An unknown error occurred', content: [] };
    }
  },
};
