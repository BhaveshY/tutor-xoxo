import { createClient } from '@supabase/supabase-js';
import { databaseService } from './databaseService.ts';

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
  generateTutorResponse: async (userId: string, prompt: string): Promise<LLMResponse> => {
    try {
      // First, save the user's message
      await databaseService.saveChatMessage({
        user_id: userId,
        message: prompt,
        is_user: true
      });

      // Get response from LLM
      const { data, error } = await supabase.functions.invoke('tutor', {
        body: { prompt },
      });

      if (error) throw error;

      // Then save the tutor's response
      await databaseService.saveChatMessage({
        user_id: userId,
        message: data.content,
        is_user: false
      });

      return data;
    } catch (error) {
      console.error('Error generating tutor response:', error);
      return { error: error instanceof Error ? error.message : 'An unknown error occurred', content: '' };
    }
  },

  generateRoadmap: async (userId: string, prompt: string): Promise<LLMResponse> => {
    try {
      const { data, error } = await supabase.functions.invoke('roadmap', {
        body: { prompt },
      });

      if (error) throw error;

      // Save the roadmap to the database
      if (data.content) {
        await databaseService.createRoadmap({
          user_id: userId,
          title: prompt,
          content: data.content
        });
      }

      return data;
    } catch (error) {
      console.error('Error generating roadmap:', error);
      return { error: error instanceof Error ? error.message : 'An unknown error occurred', content: '' };
    }
  },

  getChatHistory: async (userId: string) => {
    return databaseService.getChatHistory(userId);
  }
}; 