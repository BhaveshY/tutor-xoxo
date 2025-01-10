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
  model?: string;
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const practiceService = {
  generatePracticeQuestion: async (userId: string, params: PracticeParams): Promise<PracticeResponse> => {
    try {
      console.log('Generating practice question with params:', params);
      
      // Get question from LLM
      const { data, error } = await supabase.functions.invoke('practice', {
        body: params,
      });

      if (error) {
        console.error('Error from practice function:', error);
        throw error;
      }

      if (!data) {
        console.error('No data returned from practice function');
        throw new Error('No data returned from practice function');
      }

      console.log('Received response from practice function:', data);

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

        console.log('Created practice session:', session);

        // Return both the question and session ID
        return {
          ...data,
          sessionId: session.id
        };
      }

      return data;
    } catch (error) {
      console.error('Error generating practice question:', error);
      return { 
        error: error instanceof Error ? error.message : 'An unknown error occurred', 
        content: '' 
      };
    }
  },

  submitAnswer: async (sessionId: string, answer: string): Promise<{ score: number }> => {
    try {
      console.log('Submitting answer for session:', sessionId);
      
      // First, get the session to include the question in the evaluation
      const session = await databaseService.getPracticeSessions(sessionId);
      if (!session || session.length === 0) {
        throw new Error('Practice session not found');
      }

      const currentSession = session[0];
      console.log('Found session:', currentSession);

      // Call the evaluation endpoint with both question and answer
      const { data, error } = await supabase.functions.invoke('evaluate-answer', {
        body: { 
          sessionId,
          question: currentSession.question,
          answer 
        },
      });

      if (error) {
        console.error('Error from evaluate-answer function:', error);
        throw error;
      }

      if (!data) {
        console.error('No data returned from evaluate-answer function');
        throw new Error('No data returned from evaluate-answer function');
      }

      console.log('Received evaluation response:', data);

      // Update the practice session with the answer and score
      await databaseService.updatePracticeSession(sessionId, {
        answer,
        score: data.score,
        completed_at: new Date().toISOString()
      });

      console.log('Updated practice session with score:', data.score);

      return data;
    } catch (error) {
      console.error('Error submitting answer:', error);
      throw error;
    }
  },

  getPracticeHistory: async (userId: string): Promise<PracticeSession[]> => {
    try {
      console.log('Getting practice history for user:', userId);
      const history = await databaseService.getPracticeSessions(userId);
      console.log('Retrieved practice history:', history);
      return history;
    } catch (error) {
      console.error('Error getting practice history:', error);
      throw error;
    }
  },

  getCurrentSession: async (sessionId: string): Promise<PracticeSession | null> => {
    try {
      console.log('Getting current session:', sessionId);
      const sessions = await databaseService.getPracticeSessions(sessionId);
      const session = sessions.length > 0 ? sessions[0] : null;
      console.log('Retrieved current session:', session);
      return session;
    } catch (error) {
      console.error('Error getting current session:', error);
      throw error;
    }
  }
}; 