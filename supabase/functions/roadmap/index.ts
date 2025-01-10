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
    const { prompt, model = 'openai/gpt-4-turbo-preview' } = await req.json() as RequestBody;

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    const messages = [
      {
        role: 'system' as const,
        content: `Create a detailed learning roadmap for the given topic. You MUST follow this EXACT format:

## Topic 1: [First Major Topic]
- Subtopic 1.1
- Subtopic 1.2
- Subtopic 1.3

## Topic 2: [Second Major Topic]
- Subtopic 2.1
- Subtopic 2.2
- Subtopic 2.3

## Topic 3: [Third Major Topic]
- Subtopic 3.1
- Subtopic 3.2
- Subtopic 3.3

Important rules:
1. Each topic MUST start with "## Topic N: " where N is the topic number
2. Each subtopic MUST start with "- "
3. Do not include any other text or explanations
4. Do not use any other formatting
5. Each topic must have at least 2 subtopics
6. Create at least 3 topics
7. Topics should represent major milestones or concepts
8. Subtopics should be specific, actionable learning objectives`
      },
      {
        role: 'user' as const,
        content: prompt
      }
    ];

    const content = await callOpenRouter(messages, model);

    // Validate the response format
    const lines = content.split('\n').filter(line => line.trim());
    const topicCount = lines.filter(line => line.startsWith('## Topic')).length;
    
    if (topicCount < 3) {
      // If the format is wrong, try one more time
      const retryContent = await callOpenRouter(messages, model);
      return new Response(
        JSON.stringify({ content: retryContent }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

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