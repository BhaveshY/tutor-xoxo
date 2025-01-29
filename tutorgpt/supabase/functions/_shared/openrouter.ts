import { OpenAI } from 'https://esm.sh/openai@4.28.0';

export const createOpenAIClient = () => {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set in environment variables');
  }

  const openai = new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://tutorgpt.ai',
      'X-Title': 'TutorGPT',
      'Content-Type': 'application/json'
    }
  });

  return openai;
};

export const MODEL = 'deepseek/deepseek-r1';