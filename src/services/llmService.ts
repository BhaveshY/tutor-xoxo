import { createClient } from '@supabase/supabase-js';
import { databaseService } from './databaseService.ts';

// Available models from OpenRouter
export type LLMModel = 
  | 'openai/gpt-4-turbo-preview'
  | 'anthropic/claude-3-opus'
  | 'anthropic/claude-3-sonnet'
  | 'google/gemini-pro'
  | 'meta-llama/llama-2-70b-chat'
  | 'mistral/mistral-medium';

interface LLMResponse {
  content: string;
  error?: string;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const llmService = {
  generateTutorResponse: async (userId: string, prompt: string, model: LLMModel = 'openai/gpt-4-turbo-preview'): Promise<LLMResponse> => {
    try {
      // First, save the user's message
      await databaseService.saveChatMessage({
        user_id: userId,
        message: prompt,
        is_user: true
      });

      // Call the tutor edge function
      const { data, error } = await supabase.functions.invoke('tutor', {
        body: { prompt, model }
      });

      if (error) throw error;

      // Then save the tutor's response
      await databaseService.saveChatMessage({
        user_id: userId,
        message: data.content,
        is_user: false,
        provider: model // Store which model generated the response
      });

      return data;
    } catch (error) {
      console.error('Error generating tutor response:', error);
      return { error: error instanceof Error ? error.message : 'An unknown error occurred', content: '' };
    }
  },

  generateRoadmap: async (userId: string, prompt: string, model: LLMModel = 'openai/gpt-4-turbo-preview'): Promise<LLMResponse> => {
    try {
      // Call the roadmap edge function
      const { data, error } = await supabase.functions.invoke('roadmap', {
        body: { prompt, model }
      });

      if (error) throw error;

      // Save the roadmap to the database
      if (data.content) {
        await databaseService.createRoadmap({
          user_id: userId,
          title: prompt,
          content: data.content,
          provider: model // Store which model generated the roadmap
        });
      }

      return data;
    } catch (error) {
      console.error('Error generating roadmap:', error);
      return { error: error instanceof Error ? error.message : 'An unknown error occurred', content: '' };
    }
  },

  generateProjects: async (userId: string, roadmapId: string, model: LLMModel = 'openai/gpt-4-turbo-preview'): Promise<LLMResponse> => {
    try {
      // Call the projects edge function
      const { data, error } = await supabase.functions.invoke('projects', {
        body: { roadmapId, model }
      });

      if (error) throw error;

      try {
        const projects = JSON.parse(data.content);
        
        // Add roadmap_id and provider to each project
        const projectsToSave = projects.map((project: any) => ({
          ...project,
          roadmap_id: roadmapId,
          provider: model
        }));

        await databaseService.createProjects(projectsToSave);
      } catch (error) {
        console.error('Error parsing projects JSON:', error);
        throw new Error('Failed to parse projects from AI response');
      }

      return data;
    } catch (error) {
      console.error('Error generating projects:', error);
      return { error: error instanceof Error ? error.message : 'An unknown error occurred', content: '' };
    }
  },

  getChatHistory: async (userId: string) => {
    return databaseService.getChatHistory(userId);
  }
}; 