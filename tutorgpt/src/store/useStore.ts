import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient.ts';

interface User {
  id: string;
  name: string;
  email: string;
}

interface SavedRoadmap {
  id: string;
  title: string;
  content: string;
  timestamp: Date;
}

interface RoadmapProgress {
  roadmapId: string;
  topics: {
    id: string;
    subtopics: {
      id: string;
      completed: boolean;
    }[];
  }[];
  lastUpdated: Date;
}

interface Store {
  user: User | null;
  currentMode: 'tutor' | 'roadmap' | 'practice' | 'progress';
  roadmaps: SavedRoadmap[];
  progress: RoadmapProgress[];
  isLoading: boolean;
  emailConfirmationSent: boolean;
  setUser: (user: User | null) => void;
  setCurrentMode: (mode: 'tutor' | 'roadmap' | 'practice' | 'progress') => void;
  addRoadmap: (roadmap: SavedRoadmap) => void;
  removeRoadmap: (id: string) => void;
  updateProgress: (progress: RoadmapProgress) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const useStore = create<Store>()(
  persist(
    (set) => ({
      user: null,
      currentMode: 'tutor',
      roadmaps: [],
      progress: [],
      isLoading: false,
      emailConfirmationSent: false,
      setUser: (user) => set({ user }),
      setCurrentMode: (mode) => set({ currentMode: mode }),
      addRoadmap: (roadmap) =>
        set((state) => ({
          roadmaps: [roadmap, ...state.roadmaps],
        })),
      removeRoadmap: (id) =>
        set((state) => ({
          roadmaps: state.roadmaps.filter((r) => r.id !== id),
          progress: state.progress.filter((p) => p.roadmapId !== id),
        })),
      updateProgress: (progress) =>
        set((state) => ({
          progress: [
            ...state.progress.filter((p) => p.roadmapId !== progress.roadmapId),
            progress,
          ],
        })),
      signIn: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data: { session }, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;
          if (session) {
            set({
              user: {
                id: session.user.id,
                email: session.user.email ?? '',
                name: session.user.user_metadata?.name || session.user.email || '',
              },
              isLoading: false,
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
              data: { name },
            },
          });
          if (error) throw error;
          set({ emailConfirmationSent: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        set({ user: null });
      },
    }),
    {
      name: 'tutorgpt-storage',
      partialize: (state) => ({
        user: state.user,
        currentMode: state.currentMode,
        roadmaps: state.roadmaps,
        progress: state.progress,
      }),
    }
  )
);

export default useStore; 