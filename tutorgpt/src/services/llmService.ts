import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const llmService = {
  generateTutorResponse: async (prompt: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('tutor', {
        body: { prompt },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error generating tutor response:', error);
      return { error: error.message };
    }
  },

  generateRoadmap: async (prompt: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('roadmap', {
        body: { prompt },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error generating roadmap:', error);
      return { error: error.message };
    }
  },

  generatePracticeQuestions: async (prompt: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('practice', {
        body: { prompt },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error generating practice questions:', error);
      return { error: error.message };
    }
  },
}; 