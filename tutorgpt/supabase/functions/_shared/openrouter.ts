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