import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { OpenAI } from 'https://esm.sh/openai@4.28.0';
import { corsHeaders } from '../_shared/cors.ts';

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

const SYSTEM_PROMPT = `You are an expert educational content creator. Generate 3 multiple-choice questions about the given topic.

Format each question exactly like this:

Q1: [Question text]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
Correct: [A/B/C/D]
Explanation: {
  "correct": "Explanation for why this is the correct answer",
  "A": "Brief explanation for A",
  "B": "Brief explanation for B",
  "C": "Brief explanation for C",
  "D": "Brief explanation for D"
}

Make sure to:
1. Include exactly 3 questions
2. Format each question exactly as shown
3. Use valid JSON for explanations
4. Separate questions with blank lines`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      status: 200,
    });
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
        { role: 'user', content: `Generate 3 multiple-choice questions about: ${prompt}` }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content || '';

    // Basic validation
    const questions = content.split('\n\n')
      .filter(q => q.trim().startsWith('Q'))
      .map(q => {
        const lines = q.split('\n').filter(l => l.trim());
        return {
          valid: (
            lines.length >= 7 &&
            lines[0].startsWith('Q') &&
            lines[1].startsWith('A)') &&
            lines[2].startsWith('B)') &&
            lines[3].startsWith('C)') &&
            lines[4].startsWith('D)') &&
            lines[5].startsWith('Correct:') &&
            lines[6].startsWith('Explanation:')
          ),
          text: q
        };
      });

    const allValid = questions.length === 3 && questions.every(q => q.valid);
    if (!allValid) {
      throw new Error('Failed to generate valid questions. Please try again.');
    }

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