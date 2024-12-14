import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { OpenAI } from 'https://esm.sh/openai@4.28.0';
import { corsHeaders } from '../_shared/cors.ts';

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

const SYSTEM_PROMPT = `You are an expert learning analyst and educational advisor. Your task is to analyze a user's learning activities and generate a comprehensive reflection of their progress.

Follow these guidelines:
1. Analyze patterns in the user's activities
2. Identify strengths and areas for improvement
3. Calculate progress in different subjects
4. Provide specific, actionable recommendations
5. Keep the tone encouraging and constructive

The response should be a JSON object with the following structure:
{
  "summary": "Overall analysis of learning progress",
  "strengths": ["Strength 1", "Strength 2", ...],
  "areasForImprovement": ["Area 1", "Area 2", ...],
  "recommendations": ["Recommendation 1", "Recommendation 2", ...],
  "subjectProgress": {
    "subject1": progressPercentage1,
    "subject2": progressPercentage2,
    ...
  }
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { activities, prompt } = await req.json();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { 
          role: 'user', 
          content: JSON.stringify({
            activities,
            prompt,
          })
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const response = completion.choices[0].message.content;

    return new Response(
      JSON.stringify({ content: response }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
}); 