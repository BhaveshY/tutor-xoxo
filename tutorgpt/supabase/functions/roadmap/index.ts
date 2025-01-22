import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createOpenAIClient, MODEL, corsHeaders } from '../_shared/openrouter.ts';

const openai = createOpenAIClient();

const SYSTEM_PROMPT = `You are a learning roadmap generator. Create a detailed, step-by-step learning roadmap based on the user's goals and requirements.

Format the roadmap as a markdown list with main topics and subtopics. Each topic should have 2-4 subtopics.

Example format:
# Learning Roadmap: [Topic]

## Prerequisites
- Basic understanding of X
- Familiarity with Y

## 1. [Main Topic 1]
- Subtopic 1.1: Brief description
- Subtopic 1.2: Brief description
- Subtopic 1.3: Brief description

## 2. [Main Topic 2]
- Subtopic 2.1: Brief description
- Subtopic 2.2: Brief description

[Continue with more topics as needed]

## Resources
- Recommended books
- Online courses
- Practice projects

## Time Estimate
- Estimated time to complete each section
- Total time commitment needed`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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