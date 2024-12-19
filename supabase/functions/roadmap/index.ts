import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface RoadmapRequest {
  prompt: string;
  model: string;
}

interface APIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt, model = 'gpt-4-turbo-preview' } = await req.json() as RoadmapRequest;

    // Get the appropriate API key and base URL based on the model
    let apiKey: string | undefined;
    let apiBase: string;
    
    switch (model) {
      case 'gpt-4-turbo-preview':
        apiKey = Deno.env.get('OPENAI_API_KEY');
        apiBase = 'https://api.openai.com/v1';
        break;
      case 'grok-2-1212':
        apiKey = Deno.env.get('XAI_API_KEY');
        apiBase = 'https://api.groq.com/openai/v1';
        break;
      case 'claude-3-5-sonnet-20241022':
        apiKey = Deno.env.get('ANTHROPIC_API_KEY');
        apiBase = 'https://api.anthropic.com/v1';
        break;
      case 'gemini-pro':
        apiKey = Deno.env.get('GOOGLE_API_KEY');
        apiBase = 'https://generativelanguage.googleapis.com/v1';
        break;
      default:
        apiKey = Deno.env.get('OPENAI_API_KEY');
        apiBase = 'https://api.openai.com/v1';
    }

    if (!apiKey) {
      throw new Error(`API key not found for model ${model}`);
    }

    const systemMessage = {
      role: 'system' as const,
      content: 'You are an expert in creating learning roadmaps. Create a detailed, structured learning path that helps students achieve their educational goals efficiently.'
    };

    const response = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [systemMessage, { role: 'user' as const, content: prompt }],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('API error response:', error);
      throw new Error(error.message || `API error: ${response.statusText}`);
    }

    const result = await response.json() as APIResponse;
    const aiResponse = {
      content: result.choices[0].message.content
    };

    return new Response(JSON.stringify(aiResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 