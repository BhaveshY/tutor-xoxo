import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createOpenAIClient, MODEL } from '../_shared/openrouter.ts';
import { createCorsResponse, handleOptionsRequest } from '../_shared/cors.ts';

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
- Keep formatting clean and consistent`;

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