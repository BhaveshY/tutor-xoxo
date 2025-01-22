import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { LLMModel, callOpenRouter } from "../_shared/openrouter.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

interface RequestBody {
  roadmapId?: string;
  topic?: string;
  model: LLMModel;
}

interface Project {
  title: string;
  description: string;
  requirements: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

function cleanJsonResponse(content: string): string {
  // Remove markdown code blocks if present
  content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  // Remove any leading/trailing whitespace
  content = content.trim();
  return content;
}

function validateProject(project: any, index: number): Project {
  if (!project.title || typeof project.title !== 'string') {
    throw new Error(`Project ${index + 1}: Missing or invalid title`);
  }
  if (!project.description || typeof project.description !== 'string') {
    throw new Error(`Project ${index + 1}: Missing or invalid description`);
  }
  if (!project.requirements || typeof project.requirements !== 'string') {
    throw new Error(`Project ${index + 1}: Missing or invalid requirements`);
  }
  if (!project.difficulty || !['Beginner', 'Intermediate', 'Advanced'].includes(project.difficulty)) {
    throw new Error(`Project ${index + 1}: Invalid difficulty level`);
  }
  return project as Project;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { roadmapId, topic, model } = await req.json() as RequestBody

    if (!roadmapId && !topic) {
      throw new Error('Either roadmapId or topic is required')
    }

    let prompt = '';
    
    if (roadmapId) {
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

      prompt = `Generate practical coding projects based on this learning roadmap:\n\n${roadmap.content}`;
    } else if (topic) {
      prompt = `Generate practical coding projects about: ${topic}`;
    }

    const messages = [
      {
        role: 'system' as const,
        content: `You are an expert at creating practical coding projects. Generate 3-5 projects that help students learn through hands-on experience.

For each project, provide:
1. A clear, concise title
2. A brief but informative description
3. Detailed technical requirements and implementation steps
4. An appropriate difficulty level

Return ONLY a JSON array of objects with this exact structure (no markdown, no code blocks, just the JSON):
[
  {
    "title": "Project Title",
    "description": "A clear description of what the project involves",
    "requirements": "Detailed technical requirements and step-by-step implementation guide",
    "difficulty": "Beginner" | "Intermediate" | "Advanced"
  }
]

Make sure:
1. Each project title is unique and descriptive
2. The description explains what will be built and why it's valuable
3. Requirements include specific technical details and clear steps
4. Difficulty accurately reflects the project's complexity`
      },
      {
        role: 'user' as const,
        content: prompt
      }
    ]

    const content = await callOpenRouter(messages)
    const cleanedContent = cleanJsonResponse(content);

    // Parse and validate the response
    let projects: Project[];
    try {
      const parsed = JSON.parse(cleanedContent);
      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }
      if (parsed.length < 1) {
        throw new Error('No projects generated');
      }
      projects = parsed.map((project, index) => validateProject(project, index));
    } catch (error: unknown) {
      console.error('Validation error:', error);
      console.error('Raw content:', content);
      console.error('Cleaned content:', cleanedContent);
      throw new Error('Failed to generate valid project data: ' + 
        (error instanceof Error ? error.message : 'Unknown validation error'));
    }

    return new Response(
      JSON.stringify({ content: projects }),
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