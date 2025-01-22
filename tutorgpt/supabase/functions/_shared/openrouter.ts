import { OpenAI } from 'https://esm.sh/openai@4.28.0';

export const createOpenAIClient = () => {
  const openai = new OpenAI({
    apiKey: Deno.env.get('OPENAI_API_KEY'),
    baseURL: 'https://api.openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://tutorgpt.ai',
      'X-Title': 'TutorGPT'
    }
  });

  return openai;
};

export const MODEL = 'deepseek-coder-33b-instruct';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}; 