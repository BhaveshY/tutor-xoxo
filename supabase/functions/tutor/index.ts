import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { LLMModel, callOpenRouter } from "../_shared/openrouter.ts";

interface RequestBody {
  prompt: string;
  model: LLMModel;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt, model = 'openai/gpt-4o-mini' } = await req.json() as RequestBody;

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    const messages = [
      {
        role: 'system' as const,
        content: 'You are a helpful and knowledgeable AI tutor. Provide clear, accurate, and engaging responses to help students learn.'
      },
      {
        role: 'user' as const,
        content: prompt
      }
    ];

    const content = await callOpenRouter(messages, model);

    return new Response(
      JSON.stringify({ content }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
}); 