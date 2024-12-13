
import { createClient } from "@supabase/supabase-js";
import { Configuration, OpenAIApi } from "openai";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  topic: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { topic } = await req.json() as RequestBody;

    // Create a Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get the user's session
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Not authenticated');
    }

    // Initialize OpenAI
    const configuration = new Configuration({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });
    const openai = new OpenAIApi(configuration);

    // Generate practice questions using GPT-4
    const completion = await openai.createChatCompletion({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert question generator. Create a set of multiple-choice questions to test knowledge on the given topic.
          For each question:
          1. Provide a clear question statement
          2. Give 4 possible answers (A, B, C, D)
          3. Indicate the correct answer
          4. Include a brief explanation of why it's correct
          
          Format the output in markdown, with each question clearly separated.`,
        },
        {
          role: 'user',
          content: `Generate 5 practice questions about: ${topic}`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const response = completion.data.choices[0]?.message?.content || 'No questions generated';

    return new Response(
      JSON.stringify({
        content: response,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
}); 