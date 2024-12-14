import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { OpenAI } from 'https://esm.sh/openai@4.28.0';
import { corsHeaders } from '../_shared/cors.ts';

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

const SYSTEM_PROMPT = `You are an expert educational content creator who specializes in creating practice questions.
Your task is to generate a set of practice questions based on the given topic and difficulty level.

Follow these guidelines:
1. Create 3 multiple-choice questions that test different aspects of the topic
2. Each question should:
   - Be clear and unambiguous
   - Have exactly 4 options (A, B, C, D)
   - Include a correct answer and explanation
   - Match the specified difficulty level exactly
3. Format the response as a valid JSON array of questions

Example format:
[
  {
    "id": "1",
    "question": "What is the capital of France?",
    "options": {
      "A": "London",
      "B": "Paris",
      "C": "Berlin",
      "D": "Madrid"
    },
    "correct": "B",
    "explanation": "Paris is the capital and largest city of France.",
    "difficulty": "medium"
  }
]

IMPORTANT: All questions must be at the specified difficulty level. Do not mix difficulty levels.`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt, difficulty = 'medium' } = await req.json();

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

    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return new Response(
        JSON.stringify({ error: 'Invalid difficulty level. Must be one of: easy, medium, hard' }),
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
        { role: 'user', content: `Generate 3 ${difficulty}-difficulty multiple-choice questions about: ${prompt}` }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content generated from OpenAI');
    }

    // Attempt to parse the response as JSON
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Failed to parse questions format');
    }

    // Validate the response structure
    if (!Array.isArray(parsedContent)) {
      throw new Error('Response is not an array of questions');
    }

    // Ensure all questions have the correct difficulty
    parsedContent = parsedContent.map(question => ({
      ...question,
      difficulty
    }));

    // Convert the response to a string format
    const responseContent = JSON.stringify({ content: JSON.stringify(parsedContent) });

    return new Response(
      responseContent,
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in practice function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        details: error instanceof Error ? error.stack : undefined,
      }),
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