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
  difficulty: string;
  question: string;
  answer: string | null;
  score: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface LearningRoadmap {
  id: string;
  user_id: string;
  title: string;
  content: string;
  provider?: string;
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
    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
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
    const { data, error } = await supabase
      .from('learning_roadmaps')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  createRoadmap: async (roadmap: Omit<LearningRoadmap, 'id' | 'created_at' | 'updated_at'>): Promise<LearningRoadmap> => {
    const { data, error } = await supabase
      .from('learning_roadmaps')
      .insert(roadmap)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  updateRoadmap: async (roadmapId: string, updates: Partial<LearningRoadmap>): Promise<LearningRoadmap> => {
    const { data, error } = await supabase
      .from('learning_roadmaps')
      .update(updates)
      .eq('id', roadmapId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  deleteRoadmap: async (roadmapId: string): Promise<void> => {
    const { error } = await supabase
      .from('learning_roadmaps')
      .delete()
      .eq('id', roadmapId);

    if (error) throw error;
  }
}; 