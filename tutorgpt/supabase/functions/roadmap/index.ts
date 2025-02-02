import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createOpenAIClient, MODEL } from '../_shared/openrouter.ts';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const openai = createOpenAIClient();

const SYSTEM_PROMPT = `You are a learning roadmap generator. Create a detailed, step-by-step learning roadmap based on the user's goals and requirements.

Format the roadmap as a markdown list with main topics and subtopics. Each topic should have 2-4 subtopics. Important: Do not include any numbering or section numbers for subtopics - present them as clean bullet points only.

Example format:
# Learning Roadmap: [Topic]

## Prerequisites
- Basic understanding of X
- Familiarity with Y

## 1. [Main Topic 1]
- Regression: Brief description
- Classification: Brief description
- Neural Networks: Brief description

## 2. [Main Topic 2]
- Clean subtopic: Brief description
- Another subtopic: Brief description

[Continue with more topics as needed]

Remember: 
- Never include numbering (like 1.1, 1.2) for subtopics
- Present subtopics as simple bullet points
- Keep formatting clean and consistent
- Include Resources (links for each topic)`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    return new Response(
      JSON.stringify({ content: completion.choices[0]?.message?.content || '' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
}); 