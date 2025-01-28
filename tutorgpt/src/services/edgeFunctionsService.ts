import { supabase } from '../lib/supabaseClient.ts';

export interface EdgeFunctionResponse<T = any> {
  data: T | null;
  error: Error | null;
}

export const edgeFunctionsService = {
  invoke: async <T>(
    functionName: string,
    body: any = {},
    options: { throwOnError?: boolean } = {}
  ): Promise<EdgeFunctionResponse<T>> => {
    try {
      console.log(`Invoking edge function: ${functionName}`, { body });
      
      const { data, error } = await supabase.functions.invoke<T>(functionName, {
        body,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (error && options.throwOnError) {
        throw error;
      }

      console.log(`Edge function ${functionName} response:`, { data, error });

      return { data, error: error || null };
    } catch (error) {
      console.error(`Error invoking edge function ${functionName}:`, error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error occurred')
      };
    }
  }
}; 