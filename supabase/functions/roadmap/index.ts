import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { OpenAI } from 'https://esm.sh/openai@4.28.0';
import { corsHeaders } from '../_shared/cors.ts';

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

const SYSTEM_PROMPT = `You are an expert educational consultant who creates personalized learning roadmaps. 
Your task is to create a detailed, structured learning roadmap based on the user's goals and current level.

Follow these guidelines:
1. Start with a brief overview of the learning journey
2. Break down the roadmap into clear milestones
3. For each milestone:
   - Specify clear learning objectives
   - Recommend specific resources (books, courses, tutorials)
   - Include practice exercises or projects
   - Estimate time requirements
4. Add checkpoints for progress assessment
5. Include tips for maintaining motivation
6. Format the response in clear Markdown with proper headings and sections

Use this structure:
# Learning Roadmap: [Topic]

## Overview
[Brief description of the learning journey]

## Prerequisites
[List any required background knowledge]

## Milestone 1: [Title]
### Learning Objectives
- [Objective 1]
- [Objective 2]

### Resources
- [Resource 1]
- [Resource 2]

### Practice
- [Exercise/Project 1]
- [Exercise/Project 2]

[Continue with more milestones...]

## Assessment Checkpoints
[List of ways to verify progress]

## Tips for Success
[Motivational and practical tips]`;

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