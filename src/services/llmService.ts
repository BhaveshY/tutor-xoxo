import { supabase } from '../../tutorgpt/src/lib/supabaseClient.ts';
import { databaseService, ProjectSuggestion } from './databaseService.ts';

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

interface ProjectGenerationParams {
  topic: string;
  preferredDifficulty?: 'beginner' | 'intermediate' | 'advanced';
  preferredTech?: string[];
}

interface ProjectResponse {
  content?: ProjectSuggestion[];
  error?: string;
}

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

      return {
        content: data.content,
        metadata: {
          count: data.content.length,
          difficulty,
          provider
        }
      };
    } catch (error) {
      console.error('Error generating practice questions:', error);
      return { error: error instanceof Error ? error.message : 'An unknown error occurred', content: [] };
    }
  },

  generateProjects: async (params: ProjectGenerationParams): Promise<ProjectResponse> => {
    try {
      console.log('Generating projects with params:', params);
      
      const { data, error } = await supabase.functions.invoke<ProjectResponse>('projects', {
        body: params
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }
      
      if (!data?.content) {
        console.error('No data in response:', data);
        throw new Error('No project suggestions returned');
      }

      console.log('Successfully generated projects:', data.content);
      return data;
    } catch (error) {
      console.error('Error generating projects:', error);
      return { 
        error: error instanceof Error ? error.message : 'Failed to generate project suggestions',
        content: [] 
      };
    }
  }
}; 