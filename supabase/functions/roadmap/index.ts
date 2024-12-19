import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface RoadmapRequest {
  prompt: string;
  model: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt, model = 'openai/gpt-4-turbo-preview' } = await req.json() as RoadmapRequest;

    const systemMessage = {
      role: 'system' as const,
      content: `You are an expert in creating learning roadmaps. Create a detailed, structured learning path that helps students achieve their educational goals efficiently.

Format your response exactly as follows:
1. Each major milestone should start with "## Milestone: " followed by the milestone title
2. Under each milestone, list the tasks/subtopics starting with "- " 
3. Keep the tasks actionable and specific

Example format:
## Milestone: Foundation Concepts
- Learn basic syntax and data types
- Practice writing simple programs
- Complete introductory exercises

## Milestone: Intermediate Topics
- Study control structures
- Implement basic algorithms
- Build small projects`
    };

    const messages = [systemMessage, { role: 'user' as const, content: prompt }];

    // Get the appropriate API key and base URL based on the provider
    const [provider] = model.split('/');
    let apiKey: string | undefined;
    let apiBase: string;
    let modelName: string;
    
    switch (provider) {
      case 'openai':
        apiKey = Deno.env.get('OPENAI_API_KEY');
        apiBase = 'https://api.openai.com/v1';
        modelName = 'gpt-4-1106-preview';
        break;
      case 'groq':
        apiKey = Deno.env.get('GROQ_API_KEY');
        apiBase = 'https://api.groq.com/openai/v1';
        modelName = 'mixtral-8x7b-32768';
        break;
      case 'anthropic':
        apiKey = Deno.env.get('ANTHROPIC_API_KEY');
        apiBase = 'https://api.anthropic.com/v1';
        modelName = 'claude-3-sonnet-20240229';
        break;
      default:
        apiKey = Deno.env.get('OPENAI_API_KEY');
        apiBase = 'https://api.openai.com/v1';
        modelName = 'gpt-4-1106-preview';
    }

    if (!apiKey) {
      throw new Error(`API key not found for provider ${provider}`);
    }

    // Make request to provider's API directly
    const response = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(provider === 'anthropic' ? { 'anthropic-version': '2023-06-01' } : {})
      },
      body: JSON.stringify({
        model: modelName,
        messages,
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('API error response:', error);
      throw new Error(error.message || `API error: ${response.statusText}`);
    }

    const result = await response.json();
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