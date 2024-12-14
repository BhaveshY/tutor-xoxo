import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface LLMResponse {
  content: string;
  error?: string;
}

interface ActivitySummary {
  type: 'chat' | 'practice' | 'roadmap';
  subject?: string;
  timestamp: Date;
  success?: boolean;
  score?: number;
}

interface ReflectionParams {
  activities: ActivitySummary[];
  prompt: string;
}

type PracticeParams = {
  prompt: string;
  difficulty: 'easy' | 'medium' | 'hard';
};

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const llmService = {
  generateTutorResponse: async (prompt: string): Promise<LLMResponse> => {
    try {
      const { data, error } = await supabase.functions.invoke('tutor', {
        body: { prompt },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error generating tutor response:', error);
      return { error: error instanceof Error ? error.message : 'An unknown error occurred', content: '' };
    }
  },

  generateRoadmap: async (prompt: string): Promise<LLMResponse> => {
    try {
      const { data, error } = await supabase.functions.invoke('roadmap', {
        body: { prompt },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error generating roadmap:', error);
      return { error: error instanceof Error ? error.message : 'An unknown error occurred', content: '' };
    }
  },

  generatePracticeQuestions: async (params: PracticeParams): Promise<LLMResponse> => {
    try {
      const { data, error } = await supabase.functions.invoke('practice', {
        body: params,
      });

      if (error) throw error;
      return { content: data.content };
    } catch (error) {
      console.error('Error generating practice questions:', error);
      return { error: error instanceof Error ? error.message : 'An unknown error occurred', content: '' };
    }
  },

  generateReflection: async (params: ReflectionParams): Promise<LLMResponse> => {
    try {
      const { data, error } = await supabase.functions.invoke('reflection', {
        body: params,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error generating reflection:', error);
      return { error: error instanceof Error ? error.message : 'An unknown error occurred', content: '' };
    }
  },
}; 