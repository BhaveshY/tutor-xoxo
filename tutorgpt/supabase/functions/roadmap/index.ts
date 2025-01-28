import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createOpenAIClient, MODEL } from '../_shared/openrouter.ts';
import { createCorsResponse, handleOptionsRequest } from '../_shared/cors.ts';

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
    return handleOptionsRequest();
  }

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return createCorsResponse({ error: 'Prompt is required' }, 400);
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

    return createCorsResponse({ content: completion.choices[0]?.message?.content || '' });

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return createCorsResponse({ error: errorMessage }, 500);
  }
}); 