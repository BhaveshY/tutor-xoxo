import { createClient } from '@supabase/supabase-js';
import { databaseService } from './databaseService.ts';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type LLMProvider = 'deepseek/deepseek-r1';

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
  selectedAnswer?: string;
  isCorrect?: boolean;
  difficulty: "easy" | "medium" | "hard";
}

type PracticeParams = {
  prompt: string;
  difficulty: 'easy' | 'medium' | 'hard';
  provider?: LLMProvider;
};

interface LLMResponse {
  content: any;
  error?: string;
  metadata?: {
    count?: number;
    difficulty?: string;
    provider?: string;
  };
}

interface PracticeResponse extends LLMResponse {
  content: PracticeQuestion[];
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const llmService = {
  generateTutorResponse: async (prompt: string, chatHistory: ChatMessage[] = [], provider: LLMProvider = 'deepseek/deepseek-r1'): Promise<LLMResponse> => {
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

  generateRoadmap: async (prompt: string, provider: LLMProvider = 'deepseek/deepseek-r1'): Promise<LLMResponse> => {
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

  generateProjects: async (prompt: string, provider: LLMProvider = 'deepseek/deepseek-r1'): Promise<LLMResponse> => {
    try {
      const { data, error } = await supabase.functions.invoke<LLMResponse>('projects', {
        body: { prompt, model: provider },
      });

      if (error) throw error;
      return data || { content: '', error: 'No response data' };
    } catch (error) {
      console.error('Error generating project suggestions:', error);
      return { error: error instanceof Error ? error.message : 'An unknown error occurred', content: '' };
    }
  },

  getChatHistory: async (userId: string) => {
    return databaseService.getChatHistory(userId);
  },

  generatePracticeQuestions: async ({ prompt, difficulty, provider = 'deepseek/deepseek-r1' }: PracticeParams): Promise<PracticeResponse> => {
    try {
      console.log('Generating practice questions with params:', { prompt, difficulty, provider });
      
      const { data, error } = await supabase.functions.invoke<{ content: PracticeQuestion[] }>('practice', {
        body: { prompt, difficulty, model: provider },
      });

      console.log('Raw response from practice function:', data);

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (!data) {
        console.error('No data returned from practice function');
        throw new Error('No data returned from practice function');
      }

      if (!data.content) {
        console.error('No content in response:', data);
        throw new Error('No content in response');
      }

      if (!Array.isArray(data.content)) {
        console.error('Content is not an array:', data.content);
        throw new Error('Invalid response format: content is not an array');
      }

      // Validate each question
      const validatedQuestions = data.content.map((q, index) => {
        console.log(`Validating question ${index + 1}:`, q);
        
        if (!q.id || !q.question || !q.options || !q.correct || !q.explanation) {
          console.error(`Invalid question format for question ${index + 1}:`, q);
          throw new Error(`Invalid question format for question ${index + 1}`);
        }

        // Ensure correct answer is valid
        if (!['A', 'B', 'C', 'D'].includes(q.correct)) {
          console.error(`Invalid correct answer for question ${index + 1}:`, q.correct);
          throw new Error(`Invalid correct answer format in question ${index + 1}`);
        }

        // Return validated question
        return {
          id: q.id,
          question: q.question,
          options: {
            A: q.options.A,
            B: q.options.B,
            C: q.options.C,
            D: q.options.D
          },
          correct: q.correct as "A" | "B" | "C" | "D",
          explanation: q.explanation,
          difficulty: q.difficulty || difficulty
        };
      });

      console.log('Validated questions:', validatedQuestions);

      return { 
        content: validatedQuestions
      };
    } catch (error) {
      console.error('Error generating practice questions:', error);
      return { error: error instanceof Error ? error.message : 'An unknown error occurred', content: [] };
    }
  },
}; 