import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'
import OpenAI from "https://esm.sh/openai@4.20.1"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { roadmapId, topic } = await req.json()

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get roadmap content if roadmapId is provided
    let roadmapContent = ''
    if (roadmapId) {
      const { data: roadmap } = await supabaseClient
        .from('learning_roadmaps')
        .select('content')
        .eq('id', roadmapId)
        .single()
      
      if (roadmap) {
        roadmapContent = roadmap.content
      }
    }

    const systemPrompt = `You are a helpful AI that generates practical project suggestions for learning programming and technology. 
    Each project should be detailed and actionable, with clear implementation steps.`

    const userPrompt = `Generate 3 practical project suggestions ${roadmapContent ? 'based on this learning roadmap:\n\n' + roadmapContent : 'for the topic: ' + topic}. 
    For each project, provide:
    1. A clear title
    2. A brief description of what the project accomplishes
    3. A detailed implementation plan with steps
    4. Difficulty level (Beginner/Intermediate/Advanced)

    Format the response in JSON like this:
    {
      "projects": [
        {
          "title": "Project Title",
          "description": "Project description",
          "implementation_plan": "Step-by-step implementation details",
          "difficulty": "Difficulty level"
        }
      ]
    }
    
    Make sure the response is valid JSON and includes exactly these fields.`

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    })
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    })

    const responseContent = completion.choices[0].message.content || '{}'

    // Validate JSON response
    const projects = JSON.parse(responseContent)
    if (!projects.projects || !Array.isArray(projects.projects)) {
      throw new Error('Invalid response format from AI')
    }

    return new Response(
      JSON.stringify(projects),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error: unknown) {
    console.error('Error in projects function:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
}) 