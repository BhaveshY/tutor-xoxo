import { supabase } from '../lib/supabaseClient.ts';
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

  generateProjectSuggestion: async (params: ProjectGenerationParams): Promise<LLMResponse> => {
    try {
      console.log('Generating project suggestion with params:', params);
      
      const prompt = `Generate a detailed project suggestion for a ${params.preferredDifficulty || 'intermediate'} level project about ${params.topic}.
      The project should:
      ${params.preferredTech?.length ? `- Use the following technologies: ${params.preferredTech.join(', ')}` : ''}
      - Include specific learning outcomes
      - Have a clear description and goals
      
      Format the response as a JSON object with the following structure:
      {
        "title": "Project Title",
        "description": "Detailed project description",
        "difficulty": "${params.preferredDifficulty || 'intermediate'}",
        "estimated_hours": 10,
        "tech_stack": ["tech1", "tech2"],
        "learning_outcomes": ["outcome1", "outcome2"]
      }`;

      const requestBody = {
        prompt,
        model: 'anthropic/claude-2',
        params
      };

      console.log('Sending request to Edge Function:', requestBody);
      
      const { data, error } = await supabase.functions.invoke<LLMResponse>('project', {
        body: requestBody
      });

      console.log('Response from Edge Function:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (!data) {
        console.error('No data returned from project function');
        throw new Error('No data returned from project function');
      }

      return { content: data.content, error: undefined };
    } catch (error) {
      console.error('Error generating project suggestion:', error);
      return { error: error instanceof Error ? error.message : 'An unknown error occurred', content: null };
    }
  },

  generateProjects: async (params: ProjectGenerationParams): Promise<ProjectResponse> => {
    try {
      console.log('Generating projects with params:', params);
      
      const { data, error } = await supabase.functions.invoke<ProjectResponse | ProjectSuggestion[]>('projects', {
        body: {
          ...params,
          model: 'deepseek/deepseek-r1'
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }
      
      if (!data) {
        console.error('No data returned from projects function');
        throw new Error('No data returned from projects function');
      }

      // Handle both direct array responses and wrapped responses
      const suggestions = Array.isArray(data) ? data : data.content;
      
      if (!suggestions) {
        console.error('No suggestions in response:', data);
        throw new Error('No project suggestions returned');
      }

      if (!Array.isArray(suggestions)) {
        console.error('Content is not an array:', suggestions);
        throw new Error('Invalid response format: content is not an array');
      }

      if (suggestions.length === 0) {
        console.error('Empty suggestions array');
        throw new Error('No project suggestions returned');
      }

      // Validate each suggestion
      suggestions.forEach((suggestion, index) => {
        if (!suggestion.title?.trim()) throw new Error(`Missing title in suggestion ${index}`);
        if (!suggestion.description?.trim()) throw new Error(`Missing description in suggestion ${index}`);
        if (!['beginner', 'intermediate', 'advanced'].includes(suggestion.difficulty)) {
          throw new Error(`Invalid difficulty in suggestion ${index}`);
        }
        if (typeof suggestion.estimated_hours !== 'number' || suggestion.estimated_hours <= 0) {
          throw new Error(`Invalid estimated hours in suggestion ${index}`);
        }
        if (!Array.isArray(suggestion.tech_stack) || suggestion.tech_stack.length === 0) {
          throw new Error(`Invalid tech stack in suggestion ${index}`);
        }
        if (!Array.isArray(suggestion.learning_outcomes) || suggestion.learning_outcomes.length === 0) {
          throw new Error(`Invalid learning outcomes in suggestion ${index}`);
        }
      });

      console.log('Successfully generated projects:', suggestions);
      return { content: suggestions };
    } catch (error) {
      console.error('Error generating projects:', error);
      return { 
        error: error instanceof Error ? error.message : 'Failed to generate project suggestions',
        content: [] 
      };
    }
  }
}; 