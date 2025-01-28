import { supabase } from '../lib/supabaseClient.ts';

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  is_user: boolean;
  provider?: string;
  created_at: string;
}

export interface PracticeSession {
  id: string;
  user_id: string;
  subject: string;
  question: string;
  answer?: string;
  score?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  created_at?: Date;
  updated_at?: Date;
}

export interface LearningRoadmap {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectSuggestion {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_hours: number;
  tech_stack: string[];
  learning_outcomes: string[];
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  suggestion_id?: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_hours: number;
  tech_stack: string[];
  learning_outcomes: string[];
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number;
  created_at: string;
  updated_at: string;
}

export const databaseService = {
  // Profile operations
  getProfile: async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  updateProfile: async (userId: string, updates: Partial<Profile>): Promise<Profile> => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Chat history operations
  getChatHistory: async (userId: string): Promise<ChatMessage[]> => {
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching chat history:', error);
      throw error;
    }
  },

  saveChatMessage: async (message: Omit<ChatMessage, 'id' | 'created_at'>): Promise<ChatMessage> => {
    const { data, error } = await supabase
      .from('chat_history')
      .insert(message)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Practice session operations
  getPracticeSessions: async (userId: string): Promise<PracticeSession[]> => {
    const { data, error } = await supabase
      .from('practice_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  getPracticeSession: async (sessionId: string): Promise<PracticeSession | null> => {
    const { data, error } = await supabase
      .from('practice_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) throw error;
    return data;
  },

  createPracticeSession: async (session: Omit<PracticeSession, 'id' | 'created_at' | 'completed_at'>): Promise<PracticeSession> => {
    const { data, error } = await supabase
      .from('practice_sessions')
      .insert(session)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  updatePracticeSession: async (sessionId: string, updates: Partial<PracticeSession>): Promise<PracticeSession> => {
    const { data, error } = await supabase
      .from('practice_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Learning roadmap operations
  getRoadmaps: async (userId: string): Promise<LearningRoadmap[]> => {
    try {
      const { data, error } = await supabase
        .from('roadmaps')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching roadmaps:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getRoadmaps:', error);
      throw error;
    }
  },

  createRoadmap: async (roadmap: Omit<LearningRoadmap, 'id' | 'created_at' | 'updated_at'>): Promise<LearningRoadmap> => {
    try {
      const { data, error } = await supabase
        .from('roadmaps')
        .insert([roadmap])
        .select()
        .single();

      if (error) {
        console.error('Error creating roadmap:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createRoadmap:', error);
      throw error;
    }
  },

  updateRoadmap: async (id: string, updates: Partial<LearningRoadmap>): Promise<LearningRoadmap> => {
    try {
      const { data, error } = await supabase
        .from('roadmaps')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating roadmap:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in updateRoadmap:', error);
      throw error;
    }
  },

  deleteRoadmap: async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('roadmaps')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting roadmap:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteRoadmap:', error);
      throw error;
    }
  },

  // Project suggestion operations
  getProjectSuggestions: async () => {
    const { data, error } = await supabase
      .from('project_suggestions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as ProjectSuggestion[];
  },

  // Project operations
  createProject: async (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('projects')
      .insert([project])
      .select()
      .single();

    if (error) throw error;
    return data as Project;
  },

  getProjects: async (userId: string) => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Project[];
  },

  updateProject: async (projectId: string, updates: Partial<Project>) => {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;
    return data as Project;
  },

  deleteProject: async (projectId: string) => {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) throw error;
  }
}; 