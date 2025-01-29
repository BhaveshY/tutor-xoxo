import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createOpenAIClient, MODEL } from '../_shared/openrouter.ts';
import { createCorsResponse, handleOptionsRequest } from '../_shared/cors.ts';

const openai = createOpenAIClient();

interface PracticeQuestion {
  id: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct: "A" | "B" | "C" | "D";
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
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

function parseQuestion(text: string, difficulty: string): PracticeQuestion | null {
  const lines = text.split('\n').filter(l => l.trim());
  
  if (lines.length < 7) return null;
  
  const question = lines[0].replace(/^Q\d+:\s*/, '').trim();
  const options = {
    A: lines[1].replace(/^A\)\s*/, '').trim(),
    B: lines[2].replace(/^B\)\s*/, '').trim(),
    C: lines[3].replace(/^C\)\s*/, '').trim(),
    D: lines[4].replace(/^D\)\s*/, '').trim(),
  };
  
  const correct = lines[5].replace(/^Correct:\s*/, '').trim() as "A" | "B" | "C" | "D";
  const explanation = lines[6].replace(/^Explanation:\s*/, '').trim();
  
  return {
    id: crypto.randomUUID(),
    question,
    options,
    correct,
    explanation,
    difficulty: difficulty as "easy" | "medium" | "hard"
  };
}

function validateQuestion(question: string): { valid: boolean; error?: string } {
  const lines = question.split('\n').filter(l => l.trim());
  
  if (lines.some(line => line.startsWith('Answer:'))) {
    return { valid: false, error: 'Question is using Answer format instead of multiple choice options' };
  }

  if (lines.length < 7) {
    return { valid: false, error: `Question has ${lines.length} lines, expected at least 7` };
  }

  if (!lines[0].match(/^Q\d+:/)) {
    return { valid: false, error: `Invalid question format: ${lines[0]}` };
  }

  if (!lines[1].startsWith('A)')) {
    return { valid: false, error: `Invalid option A format: ${lines[1]}` };
  }

  if (!lines[2].startsWith('B)')) {
    return { valid: false, error: `Invalid option B format: ${lines[2]}` };
  }

  if (!lines[3].startsWith('C)')) {
    return { valid: false, error: `Invalid option C format: ${lines[3]}` };
  }

  if (!lines[4].startsWith('D)')) {
    return { valid: false, error: `Invalid option D format: ${lines[4]}` };
  }

  if (!lines[5].startsWith('Correct:')) {
    return { valid: false, error: `Invalid correct answer format: ${lines[5]}` };
  }

  const correct = lines[5].replace(/^Correct:\s*/, '').trim();
  if (!['A', 'B', 'C', 'D'].includes(correct)) {
    return { valid: false, error: `Invalid correct answer value: ${correct}` };
  }

  if (!lines[6].startsWith('Explanation:')) {
    return { valid: false, error: `Invalid explanation format: ${lines[6]}` };
  }

  return { valid: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    const { prompt, difficulty = 'medium', model = MODEL } = await req.json();

    if (!prompt) {
      return createCorsResponse({ error: 'Prompt is required' }, 400);
    }

    console.log('Generating questions for prompt:', prompt);

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Generate 3 ${difficulty} difficulty multiple-choice questions about: ${prompt}. Remember to use A) B) C) D) format with exactly 4 options for each question. DO NOT use 'Answer:' format.` }
      ],
      temperature: 0.5,
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content || '';
    console.log('Raw response:', content);

    // Split and validate questions
    const questions = content.split('\n\n')
      .filter(q => q.trim().startsWith('Q'));

    console.log(`Found ${questions.length} questions`);

    const validationResults = questions.map((q, index) => {
      const validation = validateQuestion(q);
      if (!validation.valid) {
        console.error(`Question ${index + 1} validation failed:`, validation.error);
        console.error('Question content:', q);
      }
      return { ...validation, text: q };
    });

    const allValid = validationResults.length === 3 && validationResults.every(r => r.valid);
    
    if (!allValid) {
      const errors = validationResults
        .map((r, i) => r.valid ? null : `Question ${i + 1}: ${r.error}`)
        .filter(Boolean)
        .join('; ');
      
      return createCorsResponse({ error: `Failed to generate valid questions: ${errors}` }, 500);
    }

    // Parse questions into the expected format
    const parsedQuestions = questions
      .map(q => parseQuestion(q, difficulty))
      .filter((q): q is PracticeQuestion => q !== null);

    return createCorsResponse({ content: parsedQuestions });

  } catch (error) {
    console.error('Error generating questions:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return createCorsResponse({ error: errorMessage }, 500);
  }
}); 