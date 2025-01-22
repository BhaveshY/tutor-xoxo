import { createClient } from '@supabase/supabase-js';
import { databaseService } from './databaseService.ts';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

type PracticeParams = {
  prompt: string;
  difficulty: 'easy' | 'medium' | 'hard';
};

interface LLMResponse {
  content: any;
  error?: string;
  metadata?: {
    count?: number;
    difficulty?: string;
  };
}

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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const llmService = {
  generateTutorResponse: async (prompt: string, chatHistory: ChatMessage[] = []): Promise<LLMResponse> => {
    try {
      const { data, error } = await supabase.functions.invoke<LLMResponse>('tutor', {
        body: { 
          prompt,
          chatHistory,
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

  generateRoadmap: async (prompt: string): Promise<LLMResponse> => {
    try {
      const { data, error } = await supabase.functions.invoke<LLMResponse>('roadmap', {
        body: { prompt },
      });

      if (error) throw error;
      return data || { content: '', error: 'No response data' };
    } catch (error) {
      console.error('Error generating roadmap:', error);
      return { error: error instanceof Error ? error.message : 'An unknown error occurred', content: '' };
    }
  },

  generatePracticeQuestions: async ({ prompt, difficulty }: PracticeParams): Promise<PracticeResponse> => {
    try {
      const { data, error } = await supabase.functions.invoke<{ 
        content: PracticeQuestion[];
        metadata: {
          count: number;
          difficulty: string;
        };
      }>('practice', {
        body: { prompt, difficulty },
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

  getChatHistory: async (userId: string) => {
    return databaseService.getChatHistory(userId);
  }
}; 