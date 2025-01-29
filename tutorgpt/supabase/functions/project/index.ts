// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY') ?? '';

interface RequestBody {
  prompt: string;
  model: string;
  params: {
    topic: string;
    difficulty: string;
    techStack: string[];
    estimatedHours: number;
  };
}

console.log("Hello from Functions!")

serve(async (req) => {
  console.log('New request received:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Log the raw request body
    const rawBody = await req.text();
    console.log('Raw request body:', rawBody);
    
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      console.error('Failed to parse request body:', e);
      throw new Error('Invalid JSON in request body');
    }
    
    console.log('Parsed request body:', body);

    if (!body || typeof body !== 'object') {
      throw new Error('Request body must be an object');
    }

    const { prompt, model, params } = body as RequestBody;
    console.log('Extracted fields:', { prompt, model, params });

    // Validate required fields with detailed errors
    if (!prompt) {
      throw new Error('Missing required field: prompt');
    }
    if (!model) {
      throw new Error('Missing required field: model');
    }
    if (!params) {
      throw new Error('Missing required field: params');
    }
    if (!params.topic) {
      throw new Error('Missing required field: params.topic');
    }
    if (!params.difficulty) {
      throw new Error('Missing required field: params.difficulty');
    }
    if (!Array.isArray(params.techStack)) {
      throw new Error('Invalid field: params.techStack must be an array');
    }
    if (typeof params.estimatedHours !== 'number') {
      throw new Error('Invalid field: params.estimatedHours must be a number');
    }

    console.log('Validated request parameters:', { prompt, model, params });

    // Call OpenRouter API
    const openRouterPayload = {
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are a project suggestion generator. Generate detailed project suggestions based on the given parameters. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    };

    console.log('OpenRouter request payload:', openRouterPayload);
    console.log('API Key check:', {
      exists: !!OPENROUTER_API_KEY,
      length: OPENROUTER_API_KEY.length,
      prefix: OPENROUTER_API_KEY.slice(0, 10) + '...'
    });

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://tutorgptai.com',
      'X-Title': 'TutorGPT AI'
    };

    console.log('Request headers:', {
      ...headers,
      'Authorization': headers.Authorization.slice(0, 20) + '...'
    });

    const response = await fetch('https://api.openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(openRouterPayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenRouter API error response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        errorData,
      });
      throw new Error(`OpenRouter API error: ${response.statusText}. Details: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('OpenRouter API response:', data);
    
    // Parse the LLM response
    let projectData;
    try {
      const content = data.choices[0].message.content;
      console.log('Raw LLM response content:', content);
      projectData = JSON.parse(content);
      console.log('Parsed project data:', projectData);
    } catch (error) {
      console.error('Error parsing LLM response:', error);
      console.error('Raw content that failed to parse:', data.choices[0]?.message?.content);
      throw new Error('Invalid response format from LLM');
    }

    // Validate the project data structure
    const requiredFields = ['title', 'description', 'tech_stack', 'learning_outcomes'];
    const missingFields = requiredFields.filter(field => !projectData[field]);
    if (missingFields.length > 0) {
      console.error('Missing required fields in project data:', missingFields);
      throw new Error(`Invalid project data structure. Missing fields: ${missingFields.join(', ')}`);
    }

    const response_data = {
      content: {
        title: projectData.title,
        description: projectData.description,
        difficulty: params.difficulty,
        estimated_hours: params.estimatedHours,
        tech_stack: projectData.tech_stack,
        learning_outcomes: projectData.learning_outcomes,
      },
    };

    console.log('Final response data:', response_data);

    // Return the formatted response
    return new Response(
      JSON.stringify(response_data),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );

  } catch (error) {
    console.error('Error in project function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error details:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/project' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
