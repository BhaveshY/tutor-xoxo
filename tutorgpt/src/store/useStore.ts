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
  emailConfirmationSent: boolean;
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
  emailConfirmationSent: false,
  setUser: (user) => {
    set({ user });
  },
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
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (existingProfile) {
          set({ user: existingProfile });
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

      const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message.includes('Email not confirmed')) {
          throw new Error('Please confirm your email before signing in');
        }
        throw authError;
      }

      if (!session?.user) throw new Error('No user data');

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (existingProfile) {
        set({ user: existingProfile });
        return;
      }

      const pendingProfile = localStorage.getItem('pendingProfile');
      const profileData = pendingProfile 
        ? JSON.parse(pendingProfile)
        : {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata.name || email.split('@')[0],
            interests: [],
            education: ''
          };

      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert([profileData])
        .select()
        .single();

      if (insertError) {
        console.error('Profile creation error:', insertError);
        throw new Error('Failed to create user profile');
      }

      localStorage.removeItem('pendingProfile');
      set({ user: newProfile });

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
      
      const { data: { user }, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { 
            name,
            profile_data: {
              email,
              name,
              interests: [],
              education: ''
            }
          }
        }
      });

      if (authError) throw authError;
      if (!user) throw new Error('No user data returned from sign up');

      localStorage.setItem('pendingProfile', JSON.stringify({
        id: user.id,
        email,
        name,
        interests: [],
        education: ''
      }));

      set({ 
        emailConfirmationSent: true,
        user: null
      });

    } catch (error) {
      console.error('Sign up error:', error);
      throw error instanceof Error ? error : new Error('Sign up failed');
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true });
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null, emailConfirmationSent: false });
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default useStore; 