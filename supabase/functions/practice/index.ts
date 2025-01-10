import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'
import OpenAI from "https://esm.sh/openai@4.20.1"

interface PracticeRequest {
  prompt: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  model?: string;
}

// Function to clean up the AI response by removing preamble and extracting questions
function cleanupResponse(content: string): string {
  // Remove any text before the first question
  const questionStart = content.indexOf('Q1:');
  if (questionStart === -1) {
    throw new Error('No questions found in the response');
  }
  
  // Get only the questions part
  const questionsOnly = content.slice(questionStart);
  
  // Split into questions and filter out any empty lines
  const questionParts: string[] = questionsOnly
    .split(/Q\d+:/)
    .filter(q => q.trim());
    
  const questions = questionParts
    .map((q, index) => `Q${index + 1}:${q.trim()}`)
    .join('\n\n');
    
  return questions;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      prompt,
      difficulty = 'medium',
      model = 'openai/gpt-4-turbo-preview'
    } = await req.json() as PracticeRequest;

    const systemMessage = {
      role: 'system' as const,
      content: `You are an expert at creating practice questions. Generate ${difficulty} difficulty questions that help students master the concepts while maintaining an appropriate challenge level.
      
Format EXACTLY as follows:
Q1: [Question]
A) [Option]
B) [Option]
C) [Option]
D) [Option]
Correct: [A/B/C/D]
Explanation: [Explanation]

DO NOT add any introduction or extra text. Start directly with Q1.`
    };

    const messages = [systemMessage, { role: 'user' as const, content: prompt }];

    // Get the appropriate API key and base URL based on the provider
    const [provider] = model.split('/');
    let apiKey: string | undefined;
    let apiBase: string;
    let modelName: string;
    
    switch (provider) {
      case 'openai':
        apiKey = Deno.env.get('OPENAI_API_KEY');
        apiBase = 'https://api.openai.com/v1';
        modelName = 'gpt-4-1106-preview';
        break;
      case 'groq':
        apiKey = Deno.env.get('GROQ_API_KEY');
        apiBase = 'https://api.groq.com/openai/v1';
        modelName = 'mixtral-8x7b-32768';
        break;
      case 'anthropic':
        apiKey = Deno.env.get('ANTHROPIC_API_KEY');
        apiBase = 'https://api.anthropic.com/v1';
        modelName = 'claude-3-sonnet-20240229';
        break;
      default:
        apiKey = Deno.env.get('OPENAI_API_KEY');
        apiBase = 'https://api.openai.com/v1';
        modelName = 'gpt-4-1106-preview';
    }

    if (!apiKey) {
      throw new Error(`API key not found for provider ${provider}`);
    }

    // Make request to provider's API directly
    const response = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(provider === 'anthropic' ? { 'anthropic-version': '2023-06-01' } : {})
      },
      body: JSON.stringify({
        model: modelName,
        messages,
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('API error response:', error);
      throw new Error(error.message || `API error: ${response.statusText}`);
    }

    const result = await response.json();
    const rawContent = result.choices[0].message.content;
    
    // Clean up the response to remove any preamble
    const cleanedContent = cleanupResponse(rawContent);

    const aiResponse = {
      content: cleanedContent
    };

    return new Response(JSON.stringify(aiResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 