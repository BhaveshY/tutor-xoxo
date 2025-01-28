import { edgeFunctionsService } from './edgeFunctionsService.ts';
import { databaseService } from './databaseService.ts';
import type { PracticeSession } from './databaseService.ts';

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

export const practiceService = {
  generatePracticeQuestion: async (userId: string, params: PracticeParams): Promise<PracticeResponse> => {
    try {
      console.log('Generating practice question with params:', params);
      
      // Get question from LLM
      const { data, error } = await edgeFunctionsService.invoke<PracticeResponse>('practice', params);

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
  }
}; 