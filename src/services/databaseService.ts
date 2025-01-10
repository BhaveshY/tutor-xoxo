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

export interface Project {
  id: string;
  title: string;
  description: string;
  requirements?: string;
  roadmap_id: string;
  created_at: string;
  provider?: string;
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

  getProjects: async (roadmapId: string) => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('roadmap_id', roadmapId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as Project[];
  },

  createProjects: async (projects: Omit<Project, 'id' | 'created_at'>[]) => {
    const { error } = await supabase
      .from('projects')
      .insert(projects);

    if (error) throw error;
  }
};