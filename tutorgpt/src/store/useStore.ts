import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient.ts';
import { EvolutionaryOptimizer, evolutionService } from '../services/evolutionService.ts';
import { Roadmap, RoadmapMetrics, TopicMetrics } from '../types/roadmap.ts';
import { calculateProgress, parseRoadmapContent, ProgressData } from '@/pages/Progress.tsx';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Store {
  user: User | null;
  currentMode: 'tutor' | 'roadmap' | 'practice' | 'progress';
  roadmaps: Roadmap[];
  progress: RoadmapMetrics[];
  isLoading: boolean;
  emailConfirmationSent: boolean;
  progressDataStore: any[];


  updateProgressDataStore: (data: any) => void;

  // User management
  setUser: (user: User | null) => void;
  setCurrentMode: (mode: 'tutor' | 'roadmap' | 'practice' | 'progress') => void;

  // Roadmap management
  addRoadmap: (roadmap: Roadmap) => void;
  removeRoadmap: (id: string) => void;
  updateProgress: (progress: RoadmapMetrics) => void;
  getProgress: (roadmapId: string) => RoadmapMetrics | undefined;

  // Learning metrics
  updateTopicMetrics: (roadmapId: string, topicId: string, metrics: Partial<TopicMetrics>) => void;
  getTopicMetrics: (roadmapId: string, topicId: string) => TopicMetrics | undefined;

  // Roadmap optimization
  optimizeRoadmap: (roadmapId: string) => void;

  // Authentication
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const useStore = create<Store>()(
  devtools(persist(
    (set, get) => ({
      user: null,
      currentMode: 'tutor',
      roadmaps: [],
      progress: [],
      isLoading: false,
      emailConfirmationSent: false,
      progressDataStore: [],

      updateProgressDataStore: (data) => set({ progressDataStore: data }),

      setUser: (user) => set({ user }),
      setCurrentMode: (mode) => set({ currentMode: mode }),

      addRoadmap: (roadmap) =>
        set((state) => ({
          roadmaps: [roadmap, ...state.roadmaps],
          progressDataStore: [{
            id: roadmap.id,
            title: roadmap.title,
            topics: parseRoadmapContent(roadmap.content),
            progress: calculateProgress(parseRoadmapContent(roadmap.content)),
          }, ...state.progressDataStore],
        })),

      removeRoadmap: (id) =>
        set((state) => ({
          roadmaps: state.roadmaps.filter((r) => r.id !== id),
          progress: state.progress.filter((p) => p.roadmapId !== id),
        })),

      updateProgress: (progress) =>
        set((state) => {
          const newProgress = state.progress.filter(p => p.roadmapId !== progress.roadmapId);
          return {
            progress: [...newProgress, { ...progress, lastUpdated: new Date() }],
          };
        }),

      getProgress: (roadmapId) => {
        const state = get();
        return state.progress.find(p => p.roadmapId === roadmapId);
      },

      updateTopicMetrics: (roadmapId, topicId, newMetrics) =>
        set((state) => {
          const progress = state.progress.find(p => p.roadmapId === roadmapId);
          if (!progress) {
            const defaultMetrics: TopicMetrics = {
              timeSpent: 0,
              attempts: 0,
              successRate: 0,
              difficulty: 0.5,
              lastAttempt: new Date(),
              subtopics: {},
              lastAttemptTimestamp: Date.now(),
              averageTimePerSubtopic: 0,
              consistencyScore: 0,
              retentionRate: 0,
            };

            return {
              progress: [
                ...state.progress,
                {
                  roadmapId,
                  topicMetrics: {
                    [topicId]: { ...defaultMetrics, ...newMetrics },
                  },
                  lastUpdated: new Date(),
                },
              ],
            };
          }

          const existingMetrics = progress.topicMetrics[topicId] || {
            timeSpent: 0,
            attempts: 0,
            successRate: 0,
            difficulty: 0.5,
            lastAttempt: new Date(),
            subtopics: {},
            lastAttemptTimestamp: Date.now(),
            averageTimePerSubtopic: 0,
            consistencyScore: 0,
            retentionRate: 0,
          };

          // Calculate new metrics
          const updatedMetrics = {
            ...existingMetrics,
            ...newMetrics,
            lastAttempt: new Date(),
            lastAttemptTimestamp: Date.now(),
          };

          // Update averageTimePerSubtopic
          if (newMetrics.timeSpent !== undefined) {
            const completedSubtopics = Object.values(updatedMetrics.subtopics).filter(s => s.completed).length;
            updatedMetrics.averageTimePerSubtopic = completedSubtopics > 0
              ? updatedMetrics.timeSpent / completedSubtopics
              : updatedMetrics.timeSpent;
          }

          // Update consistencyScore
          const daysSinceLastAttempt = (Date.now() - existingMetrics.lastAttemptTimestamp) / (1000 * 60 * 60 * 24);
          updatedMetrics.consistencyScore = Math.max(0, 1 - (daysSinceLastAttempt / 14));

          // Update retentionRate based on success rate and time decay
          const timeFactor = Math.exp(-daysSinceLastAttempt / 30); // 30-day decay
          updatedMetrics.retentionRate = updatedMetrics.successRate * timeFactor;

          const updatedProgress = {
            ...progress,
            topicMetrics: {
              ...progress.topicMetrics,
              [topicId]: updatedMetrics,
            },
            lastUpdated: new Date(),
          };

          return {
            progress: [
              ...state.progress.filter(p => p.roadmapId !== roadmapId),
              updatedProgress,
            ],
          };
        }),

      getTopicMetrics: (roadmapId, topicId) => {
        const state = get();
        const progress = state.progress.find(p => p.roadmapId === roadmapId);
        return progress?.topicMetrics[topicId];
      },

      optimizeRoadmap: (roadmapId) =>
        set((state) => {
          const roadmap = state.roadmaps.find(r => r.id === roadmapId);
          const progress = state.progress.find(p => p.roadmapId === roadmapId);

          if (!roadmap || !progress) return state;

          const performances = roadmap.topics.map(topic => ({
            topicId: topic.id,
            metrics: {
              completionTime: progress.topicMetrics[topic.id]?.timeSpent || 0,
              attemptsCount: progress.topicMetrics[topic.id]?.attempts || 0,
              successRate: progress.topicMetrics[topic.id]?.successRate || 0,
              difficultyRating: progress.topicMetrics[topic.id]?.difficulty || 0.5,
              lastAttemptTimestamp: progress.topicMetrics[topic.id]?.lastAttemptTimestamp || Date.now(),
              averageTimePerSubtopic: progress.topicMetrics[topic.id]?.averageTimePerSubtopic || 0,
              consistencyScore: progress.topicMetrics[topic.id]?.consistencyScore || 0,
              retentionRate: progress.topicMetrics[topic.id]?.retentionRate || 0,
            },
          }));

          const optimizedTopics = evolutionService.optimizeRoadmap(roadmap.topics, performances);

          // Preserve completion status of topics and subtopics
          const optimizedTopicsWithStatus = optimizedTopics.map(topic => {
            const originalTopic = roadmap.topics.find(t => t.id === topic.id);
            return {
              ...topic,
              completed: originalTopic?.completed || false,
              subtopics: topic.subtopics.map(subtopic => {
                const originalSubtopic = originalTopic?.subtopics.find(s => s.id === subtopic.id);
                return {
                  ...subtopic,
                  completed: originalSubtopic?.completed || false,
                };
              }),
            };
          });

          return {
            roadmaps: state.roadmaps.map(r =>
              r.id === roadmapId
                ? { ...r, topics: optimizedTopicsWithStatus }
                : r
            ),
          };
        }),

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
        progressDataStore: state.progressDataStore,
      }),
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const data = JSON.parse(str);
          // Convert timestamp strings back to Date objects
          if (data.state.roadmaps) {
            data.state.roadmaps = data.state.roadmaps.map((roadmap: any) => ({
              ...roadmap,
              timestamp: new Date(roadmap.timestamp),
            }));
          }
          if (data.state.progress) {
            data.state.progress = data.state.progress.map((progress: any) => ({
              ...progress,
              lastUpdated: new Date(progress.lastUpdated),
              topicMetrics: Object.fromEntries(
                Object.entries(progress.topicMetrics).map(([id, metrics]: [string, any]) => [
                  id,
                  { ...metrics, lastAttempt: new Date(metrics.lastAttempt) }
                ])
              ),
            }));
          }
          return data;
        },
        setItem: (name, value) => localStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  ))
);

export default useStore; 