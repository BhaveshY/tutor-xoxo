import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient.ts';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  interests: string[];
  education: string;
}

interface StoreState {
  user: UserProfile | null;
  currentMode: 'tutor' | 'roadmap' | 'practice';
  isLoading: boolean;
  emailConfirmationSent: boolean;
  setCurrentMode: (mode: 'tutor' | 'roadmap' | 'practice') => void;
  setUser: (user: UserProfile) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const useStore = create<StoreState>()(
  persist(
    (set) => ({
      user: null,
      currentMode: 'tutor',
      isLoading: false,
      emailConfirmationSent: false,

      setCurrentMode: (mode) => set({ currentMode: mode }),

      setUser: async (user) => {
        const { error } = await supabase.auth.updateUser({
          data: {
            name: user.name,
            interests: user.interests,
            education: user.education
          }
        });
        if (error) throw error;
        set({ user });
      },

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
                interests: session.user.user_metadata?.interests || [],
                education: session.user.user_metadata?.education || ''
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
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name }
          }
        });
        if (error) throw error;
        set({ emailConfirmationSent: true });
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null });
      },
    }),
    {
      name: 'tutorgpt-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        currentMode: state.currentMode
      })
    }
  )
);

export default useStore; 