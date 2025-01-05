import { createClient } from '@supabase/supabase-js';
import { databaseService } from './databaseService.ts';
import type { PracticeSession } from './databaseService.ts';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface PracticeResponse {
  content: string;
  error?: string;
  sessionId?: string;
}

export type PracticeDifficulty = 'easy' | 'medium' | 'hard';

interface PracticeParams {
  prompt: string;
  difficulty: PracticeDifficulty;
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const practiceService = {
  generatePracticeQuestion: async (userId: string, params: PracticeParams): Promise<PracticeResponse> => {
    try {
      // Get question from LLM
      const { data, error } = await supabase.functions.invoke('practice', {
        body: params,
      });

      if (error) throw error;

      // Create the practice session in the database
      if (data.content) {
        const session = await databaseService.createPracticeSession({
          user_id: userId,
          subject: params.prompt,
          difficulty: params.difficulty,
          question: data.content,
          answer: undefined,
          score: undefined
        });

        // Return both the question and session ID
        return {
          ...data,
          sessionId: session.id
        };
      }

      return data;
    } catch (error) {
      console.error('Error generating practice question:', error);
      return { error: error instanceof Error ? error.message : 'An unknown error occurred', content: '' };
    }
  },

  submitAnswer: async (sessionId: string, answer: string): Promise<{ score: number }> => {
    try {
      // First, get the session to include the question in the evaluation
      const session = await databaseService.getPracticeSessions(sessionId);
      if (!session || session.length === 0) {
        throw new Error('Practice session not found');
      }

      const currentSession = session[0];

      // Call the evaluation endpoint with both question and answer
      const { data, error } = await supabase.functions.invoke('evaluate-answer', {
        body: { 
          sessionId,
          question: currentSession.question,
          answer 
        },
      });

      if (error) throw error;

      // Update the practice session with the answer and score
      await databaseService.updatePracticeSession(sessionId, {
        answer,
        score: data.score,
        completed_at: new Date().toISOString()
      });

      return data;
    } catch (error) {
      console.error('Error submitting answer:', error);
      throw error;
    }
  },

  getPracticeHistory: async (userId: string): Promise<PracticeSession[]> => {
    return databaseService.getPracticeSessions(userId);
  },

  getCurrentSession: async (sessionId: string): Promise<PracticeSession | null> => {
    const sessions = await databaseService.getPracticeSessions(sessionId);
    return sessions.length > 0 ? sessions[0] : null;
  }
}; 