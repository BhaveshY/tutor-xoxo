import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { LLMModel, callOpenRouter } from "../_shared/openrouter.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

interface RequestBody {
  roadmapId: string
  model: LLMModel
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { roadmapId, model = 'openai/gpt-4-turbo-preview' } = await req.json() as RequestBody

    if (!roadmapId) {
      throw new Error('Roadmap ID is required')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the roadmap content
    const { data: roadmap, error: roadmapError } = await supabase
      .from('roadmaps')
      .select('content')
      .eq('id', roadmapId)
      .single()

    if (roadmapError || !roadmap) {
      throw new Error('Roadmap not found')
    }

    const messages = [
      {
        role: 'system' as const,
        content: `Generate 3-5 practical coding projects based on the following learning roadmap. For each project, provide a title, description, and specific requirements. Make the projects progressively more challenging. Format your response as a JSON array with objects containing 'title', 'description', and 'requirements' fields.

Example format:
[
  {
    "title": "Project Title",
    "description": "Project description",
    "requirements": "Specific technical requirements and objectives"
  }
]`
      },
      {
        role: 'user' as const,
        content: `Generate projects for this learning roadmap:\n\n${roadmap.content}`
      }
    ]

    const content = await callOpenRouter(messages, model)

    // Parse and validate the response
    try {
      JSON.parse(content)
    } catch (error) {
      throw new Error('Failed to generate valid project data')
    }

    return new Response(
      JSON.stringify({ content }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
}) 