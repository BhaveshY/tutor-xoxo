import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ChatMessage {
  user_id: string;
  message: string;
  is_user: boolean;
  provider?: string;
}

export interface Roadmap {
  user_id: string;
  title: string;
  content: string;
  provider?: string;
}

export interface LearningRoadmap {
  id: string;
  title: string;
  content: string;
  created_at: string;
  provider?: string;
}

export interface PracticeSession {
  id: string;
  user_id: string;
  subject: string;
  difficulty: string;
  question: string;
  answer?: string;
  score?: number;
  created_at?: string;
  completed_at?: string;
}

export interface Project {
  id: string;
  user_id: string;
  suggestion_id: string;
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

export const databaseService = {
  saveChatMessage: async (message: ChatMessage) => {
    const { error } = await supabase
      .from('chat_messages')
      .insert([message]);

    if (error) throw error;
  },

  getChatHistory: async (userId: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  },

  createRoadmap: async (roadmap: Roadmap) => {
    const { error } = await supabase
      .from('roadmaps')
      .insert([roadmap]);

    if (error) throw error;
  },

  getRoadmaps: async (userId: string) => {
    const { data, error } = await supabase
      .from('roadmaps')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as LearningRoadmap[];
  },

  createPracticeSession: async (session: Omit<PracticeSession, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('practice_sessions')
      .insert([session])
      .select()
      .single();

    if (error) throw error;
    return data as PracticeSession;
  },

  getPracticeSessions: async (userId: string) => {
    const { data, error } = await supabase
      .from('practice_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as PracticeSession[];
  },

  updatePracticeSession: async (sessionId: string, updates: Partial<PracticeSession>) => {
    const { data, error } = await supabase
      .from('practice_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return data as PracticeSession;
  },

  // Project suggestion operations
  getProjectSuggestions: async (): Promise<ProjectSuggestion[]> => {
    try {
      console.log('Fetching project suggestions from database...');
      const { data, error } = await supabase
        .from('project_suggestions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error fetching suggestions:', error);
        throw error;
      }

      console.log('Successfully fetched suggestions:', data);
      return data || [];
    } catch (error) {
      console.error('Error in getProjectSuggestions:', error);
      throw error;
    }
  },

  // Project operations
  createProject: async (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> => {
    try {
      console.log('Creating new project:', project);
      const { data, error } = await supabase
        .from('projects')
        .insert([project])
        .select()
        .single();

      if (error) {
        console.error('Database error creating project:', error);
        throw error;
      }

      console.log('Successfully created project:', data);
      return data;
    } catch (error) {
      console.error('Error in createProject:', error);
      throw error;
    }
  },

  getProjects: async (userId: string): Promise<Project[]> => {
    try {
      console.log('Fetching projects for user:', userId);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error fetching projects:', error);
        throw error;
      }

      console.log('Successfully fetched projects:', data);
      return data || [];
    } catch (error) {
      console.error('Error in getProjects:', error);
      throw error;
    }
  },

  updateProject: async (projectId: string, updates: Partial<Project>): Promise<Project> => {
    try {
      console.log('Updating project:', projectId, 'with:', updates);
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId)
        .select()
        .single();

      if (error) {
        console.error('Database error updating project:', error);
        throw error;
      }

      console.log('Successfully updated project:', data);
      return data;
    } catch (error) {
      console.error('Error in updateProject:', error);
      throw error;
    }
  }
};