import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { callOpenRouter } from '../_shared/openrouter.ts'

interface PracticeRequest {
  prompt: string;
  difficulty?: 'easy' | 'medium' | 'hard';
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

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

const SYSTEM_PROMPT = `You are a multiple-choice question generator. Generate exactly 3 multiple choice questions about the given topic.

IMPORTANT: Each question MUST have exactly 4 options (A, B, C, D) in the following format:

Q1: [Question text]
A) [First option]
B) [Second option]
C) [Third option]
D) [Fourth option]
Correct: [A/B/C/D]
Explanation: [Brief explanation]

CORRECT EXAMPLE:
Q1: What is the capital of France?
A) London
B) Paris
C) Berlin
D) Madrid
Correct: B
Explanation: Paris is the capital and largest city of France.

DO NOT use this format (this is WRONG):
Q1: What is the capital of France?
Answer: Paris
Explanation: Paris is the capital of France.

DO NOT use this format either (this is WRONG):
Q1: What is the capital of France?
The answer is Paris. It is the capital city of France.

REQUIREMENTS:
1. MUST include exactly 4 options labeled as A), B), C), D)
2. MUST follow the exact format shown in the correct example
3. MUST separate questions with a blank line
4. MUST include "Correct: " followed by A, B, C, or D
5. MUST include "Explanation: " followed by the explanation
6. DO NOT use "Answer: " format
7. DO NOT use free-form text answers`;

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
    return new Response('ok', { 
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      status: 200,
    });
  }

  try {
    const { prompt, difficulty = 'medium' } = await req.json() as PracticeRequest;

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

    console.log('Generating questions for prompt:', prompt);

    const messages: Message[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Generate 3 ${difficulty} difficulty multiple-choice questions about: ${prompt}. Remember to use A) B) C) D) format with exactly 4 options for each question. DO NOT use 'Answer:' format.` }
    ];

    const content = await callOpenRouter(messages);
    console.log('Raw response:', content);

    // Split and validate questions
    const questions = content.split('\n\n')
      .filter(q => q.trim().startsWith('Q'));

    if (questions.length === 0) {
      throw new Error('No valid questions found in response');
    }

    const parsedQuestions = questions.map((q, index) => {
      const lines = q.split('\n');
      const questionText = lines[0].replace(/^Q\d+:\s*/, '').trim();
      const options = {
        A: lines[1].replace(/^A\)\s*/, '').trim(),
        B: lines[2].replace(/^B\)\s*/, '').trim(),
        C: lines[3].replace(/^C\)\s*/, '').trim(),
        D: lines[4].replace(/^D\)\s*/, '').trim(),
      };
      const correct = lines[5].replace(/^Correct:\s*/, '').trim();
      const explanation = lines[6].replace(/^Explanation:\s*/, '').trim();

      return {
        id: `q${index + 1}`,
        question: questionText,
        options,
        correct,
        explanation,
        difficulty
      };
    });

    return new Response(
      JSON.stringify({ 
        content: parsedQuestions,
        metadata: {
          count: parsedQuestions.length,
          difficulty
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An unknown error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});