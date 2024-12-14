import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { OpenAI } from 'https://esm.sh/openai@4.28.0';
import { corsHeaders } from '../_shared/cors.ts';

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

const SYSTEM_PROMPT = `You are an expert educational content creator who specializes in creating practice questions.
Your task is to generate a set of practice questions based on the given topic.

Follow these guidelines:
1. Create 3-5 questions that test different aspects of the topic
2. Each question should:
   - Be clear and unambiguous
   - Test understanding rather than just memorization
   - Include a detailed explanation of the answer
   - Provide constructive feedback for both correct and incorrect responses
3. Format each question in a consistent structure
4. Use appropriate difficulty level based on the context
5. Include a mix of question types (conceptual, practical, analytical)

Use this format for each question:

Q1: [Question text]
Answer: [Correct answer]
Explanation: [Detailed explanation of why this is the correct answer, including relevant concepts]

[Continue with more questions...]

Make sure each question is separated by a blank line for proper parsing.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content || '';

    return new Response(
      JSON.stringify({ content }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
}); 