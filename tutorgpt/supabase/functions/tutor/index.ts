import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createOpenAIClient, MODEL } from '../_shared/openrouter.ts';
import { createCorsResponse, handleOptionsRequest } from '../_shared/cors.ts';

const openai = createOpenAIClient();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    const { prompt, chatHistory = [] } = await req.json();

    if (!prompt) {
      return createCorsResponse({ error: 'Prompt is required' }, 400);
    }

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a knowledgeable and patient tutor. Explain concepts clearly and provide examples when helpful. If you are unsure about something, admit it and suggest reliable sources for further learning.'
        },
        ...chatHistory,
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    return createCorsResponse({ content: completion.choices[0]?.message?.content || '' });

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return createCorsResponse({ error: errorMessage }, 500);
  }
}); 