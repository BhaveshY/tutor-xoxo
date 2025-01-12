import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

interface PracticeRequest {
  prompt: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  model?: string;
}

interface Question {
  id: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct: string;
  explanation: string;
  difficulty: string;
}

function parseQuestions(text: string, difficulty: string): Question[] {
  console.log('Parsing questions from text:', text);
  
  // Split into individual questions
  const questions = text.split(/\n\s*\n/)
    .filter(q => q.trim().startsWith('Q'))
    .map(q => q.trim());

  console.log('Split questions:', questions);

  const parsedQuestions = questions.map((questionText, index) => {
    console.log(`Parsing question ${index + 1}:`, questionText);
    
    const lines = questionText.split('\n').map(line => line.trim());
    console.log('Question lines:', lines);
    
    // Get question text
    const questionLine = lines[0];
    const question = questionLine.replace(/^Q\d+:\s*/, '').trim();
    console.log('Extracted question:', question);

    // Get options
    const options = {
      A: lines.find(l => l.startsWith('A)'))?.replace(/^A\)\s*/, '').trim() || '',
      B: lines.find(l => l.startsWith('B)'))?.replace(/^B\)\s*/, '').trim() || '',
      C: lines.find(l => l.startsWith('C)'))?.replace(/^C\)\s*/, '').trim() || '',
      D: lines.find(l => l.startsWith('D)'))?.replace(/^D\)\s*/, '').trim() || ''
    };
    console.log('Extracted options:', options);

    // Get correct answer
    const correctLine = lines.find(l => l.startsWith('Correct:'));
    const correct = correctLine?.replace(/^Correct:\s*/, '').trim() || '';
    console.log('Extracted correct answer:', correct);

    // Get explanation
    const explanationIndex = lines.findIndex(l => l.startsWith('Explanation:'));
    const explanation = explanationIndex >= 0 
      ? lines.slice(explanationIndex)
          .join(' ')
          .replace(/^Explanation:\s*/, '')
          .trim()
      : '';
    console.log('Extracted explanation:', explanation);

    // Validate
    if (!question || !options.A || !options.B || !options.C || !options.D || !correct || !explanation) {
      console.error('Missing required fields:', {
        hasQuestion: !!question,
        hasOptionA: !!options.A,
        hasOptionB: !!options.B,
        hasOptionC: !!options.C,
        hasOptionD: !!options.D,
        hasCorrect: !!correct,
        hasExplanation: !!explanation
      });
      throw new Error(`Invalid question format for question ${index + 1}`);
    }

    if (!['A', 'B', 'C', 'D'].includes(correct)) {
      console.error('Invalid correct answer:', correct);
      throw new Error(`Invalid correct answer format in question ${index + 1}`);
    }

    const questionObj = {
      id: `q${index + 1}`,
      question,
      options,
      correct,
      explanation,
      difficulty
    };
    console.log('Created question object:', questionObj);
    return questionObj;
  });

  console.log('Final parsed questions:', parsedQuestions);
  return parsedQuestions;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt, difficulty = 'medium', model = 'openai/gpt-4o-mini' } = await req.json() as PracticeRequest;
    console.log('Received request:', { prompt, difficulty, model });
    
    const apiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!apiKey) throw new Error('OpenRouter API key not found');

    const systemPrompt = `Generate exactly 3 ${difficulty} difficulty multiple choice questions about: ${prompt}.
Each question must follow this EXACT format:

Q1: [Question]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
Correct: [A/B/C/D]
Explanation: [Explanation]

Separate questions with a blank line. Start questions with Q1:, Q2:, Q3:.`;

    console.log('Making API request with system prompt:', systemPrompt);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://tutorgptai.vercel.app',
        'X-Title': 'TutorGPT'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      console.error('API error:', response.statusText);
      throw new Error(`API error: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('API response:', result);
    
    const content = result.choices[0].message.content;
    console.log('Raw content:', content);
    
    // Parse questions into structured format
    const questions = parseQuestions(content, difficulty);
    console.log('Parsed questions:', questions);

    // Take only first 3 questions
    const finalQuestions = questions.slice(0, 3);
    console.log('Final questions:', finalQuestions);

    // Create response object
    const responseObj = { content: finalQuestions };
    console.log('Response object:', responseObj);

    // Return structured response
    return new Response(
      JSON.stringify(responseObj),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        content: [] 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
}); 