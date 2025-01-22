import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createOpenAIClient, MODEL, corsHeaders } from '../_shared/openrouter.ts';

const openai = createOpenAIClient();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt, chatHistory = [] } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    return new Response(
      JSON.stringify({ content: completion.choices[0]?.message?.content || '' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}); 