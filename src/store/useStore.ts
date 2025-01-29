import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient.ts';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Roadmap {
  id: string;
  title: string;
  content: string;
  timestamp: Date;
}

type Mode = 'tutor' | 'roadmap' | 'practice' | 'projects' | 'progress' | 'evaluation';

interface StoreState {
  user: User | null;
  isLoading: boolean;
  currentMode: Mode;
  roadmaps: Roadmap[];
  setUser: (user: User | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setCurrentMode: (mode: Mode) => void;
  addRoadmap: (roadmap: Roadmap) => void;
  removeRoadmap: (id: string) => void;
  clearRoadmaps: () => void;
  signOut: () => Promise<void>;
}

const useStore = create<StoreState>((set) => ({
  user: null,
  isLoading: true,
  currentMode: 'tutor',
  roadmaps: [],
  setUser: (user) => set({ user }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setCurrentMode: (mode) => set({ currentMode: mode }),
  addRoadmap: (roadmap) => set((state) => ({ 
    roadmaps: [...state.roadmaps, roadmap] 
  })),
  removeRoadmap: (id) => set((state) => ({ 
    roadmaps: state.roadmaps.filter(r => r.id !== id) 
  })),
  clearRoadmaps: () => set({ roadmaps: [] }),
  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  },
}));

export default useStore; 