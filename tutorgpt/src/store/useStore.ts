import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient.ts';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface RoadmapSubtopic {
  id: string;
  title: string;
  completed: boolean;
}

interface RoadmapTopic {
  id: string;
  title: string;
  subtopics: RoadmapSubtopic[];
  completed: boolean;
}

interface SavedRoadmap {
  id: string;
  title: string;
  content: string;
  topics: RoadmapTopic[];
  progress: number;
  timestamp: Date;
}

type Mode = 'tutor' | 'roadmap' | 'practice' | 'progress' | 'projects';

interface StoreState {
  currentMode: Mode;
  user: User | null;
  roadmaps: SavedRoadmap[];
  isLoading: boolean;
  emailConfirmationSent: boolean;
  setCurrentMode: (mode: Mode) => void;
  setUser: (user: User | null) => void;
  addRoadmap: (roadmap: SavedRoadmap) => void;
  removeRoadmap: (id: string) => void;
  clearRoadmaps: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
}

export const useStore = create<StoreState>()((set) => ({
  currentMode: 'tutor',
  user: null,
  roadmaps: [],
  isLoading: false,
  emailConfirmationSent: false,
  setCurrentMode: (mode) => set({ currentMode: mode }),
  setUser: (user) => set({ user }),
  addRoadmap: (roadmap) => set((state) => ({ 
    roadmaps: [...state.roadmaps, roadmap] 
  })),
  removeRoadmap: (id) => set((state) => ({
    roadmaps: state.roadmaps.filter((r) => r.id !== id)
  })),
  clearRoadmaps: () => set({ roadmaps: [] }),
  signIn: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data: { session }, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (session?.user) {
        set({
          user: {
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata?.name
          },
          isLoading: false
        });
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  signUp: async (email, password, name) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      });
      if (error) throw error;
      set({ emailConfirmationSent: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  }
}));

export default useStore; 