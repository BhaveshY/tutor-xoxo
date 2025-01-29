import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient.ts';
import { databaseService } from '../services/databaseService.ts';
import { calculateProgress } from '../pages/Progress.tsx';

// Initialize auth state
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.user) {
    useStore.getState().setUser(session.user);
  }
});

// Listen for auth changes
supabase.auth.onAuthStateChange((_event, session) => {
  useStore.getState().setUser(session?.user ?? null);
});

interface User {
  id: string;
  email?: string;
  name?: string;
  interests?: string[];
  education?: string;
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

type Mode = 'tutor' | 'roadmap' | 'practice' | 'progress' | 'projects' | 'evaluation';

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
  signOut: () => Promise<void>;
  updateRoadmapProgress: (roadmapId: string, topicId: string, subtopicId: string, completed: boolean) => void;
}

export const useStore = create<StoreState>((set, get) => ({
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      set({ user: data.user });
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  signUp: async (email, password, name) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });
      if (error) throw error;
      set({ emailConfirmationSent: true });
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null, roadmaps: [] });
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },
  updateRoadmapProgress: (roadmapId, topicId, subtopicId, completed) => {
    set((state) => {
      const updatedRoadmaps = state.roadmaps.map((roadmap) => {
        if (roadmap.id === roadmapId) {
          const updatedTopics = roadmap.topics.map((topic) => {
            if (topic.id === topicId) {
              const updatedSubtopics = topic.subtopics.map((subtopic) => {
                if (subtopic.id === subtopicId) {
                  return { ...subtopic, completed };
                }
                return subtopic;
              });
              
              // Update topic completion status based on all subtopics
              const allCompleted = updatedSubtopics.every((st) => st.completed);
              
              return {
                ...topic,
                subtopics: updatedSubtopics,
                completed: allCompleted,
              };
            }
            return topic;
          });

          // Update roadmap progress
          const progress = calculateProgress(updatedTopics);

          // Store the updated content in the database
          const updatedContent = roadmap.content.split('\n').map(line => {
            // Remove any existing checkboxes
            const cleanLine = line.replace(/\[[ x]\]/g, '').trim();
            
            if (line.startsWith('- ')) {
              const subtopic = updatedTopics.flatMap(t => t.subtopics).find(st => st.title === cleanLine.slice(2));
              if (subtopic?.completed) {
                return `- [x] ${cleanLine.slice(2)}`;
              } else {
                return `- [ ] ${cleanLine.slice(2)}`;
              }
            }
            return cleanLine;
          }).join('\n');

          // Update the roadmap in the database
          databaseService.updateRoadmap(roadmap.id, {
            content: updatedContent,
          }).catch((error) => {
            console.error('Error updating roadmap in database:', error);
          });

          return {
            ...roadmap,
            content: updatedContent,
            topics: updatedTopics,
            progress,
          };
        }
        return roadmap;
      });

      return { roadmaps: updatedRoadmaps };
    });
  },
}));

export default useStore; 