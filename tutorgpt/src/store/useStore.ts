import { create } from 'zustand';
import { supabase } from '../lib/supabase.ts';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  interests: string[];
  education: string;
}

interface LearningProgress {
  topic: string;
  progress: number;
  lastAccessed: Date;
}

interface AppState {
  user: UserProfile | null;
  currentMode: 'tutor' | 'roadmap' | 'practice';
  learningProgress: LearningProgress[];
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  setCurrentMode: (mode: 'tutor' | 'roadmap' | 'practice') => void;
  updateProgress: (progress: LearningProgress) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  setLoading: (isLoading: boolean) => void;
  initializeAuth: () => Promise<void>;
}

const useStore = create<AppState>((set, get) => ({
  user: null,
  currentMode: 'tutor',
  learningProgress: [],
  isLoading: false,
  setUser: (user) => set({ user }),
  setCurrentMode: (mode) => set({ currentMode: mode }),
  setLoading: (isLoading) => set({ isLoading }),
  updateProgress: (progress) =>
    set((state) => ({
      learningProgress: [
        ...state.learningProgress.filter((p) => p.topic !== progress.topic),
        progress,
      ],
    })),
  initializeAuth: async () => {
    try {
      set({ isLoading: true });
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          set({ user: profile as UserProfile });
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  signIn: async (email: string, password: string) => {
    try {
      set({ isLoading: true });
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profileError) throw profileError;
      if (profile) {
        set({ user: profile as UserProfile });
      }
    } catch (error) {
      console.error('Error signing in:', error);
      throw error instanceof Error ? error : new Error('Authentication failed');
    } finally {
      set({ isLoading: false });
    }
  },
  signUp: async (email: string, password: string, name: string) => {
    try {
      set({ isLoading: true });
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const newProfile: UserProfile = {
          id: data.user.id,
          email,
          name,
          interests: [],
          education: '',
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .insert([newProfile]);

        if (profileError) throw profileError;

        set({ user: newProfile });
      }
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  signOut: async () => {
    try {
      set({ isLoading: true });
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null });
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default useStore; 