import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { createOpenAIClient, MODEL } from '../_shared/openrouter.ts'
import { createCorsResponse, handleOptionsRequest } from '../_shared/cors.ts'

const openai = createOpenAIClient();

interface ProjectGenerationParams {
  topic: string;
  preferredDifficulty?: 'beginner' | 'intermediate' | 'advanced';
  preferredTech?: string[];
}

interface ProjectSuggestion {
  id?: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_hours: number;
  tech_stack: string[];
  learning_outcomes: string[];
  created_at?: string;
  updated_at?: string;
}

// Function to generate a UUID v4
function uuidv4() {
  return crypto.randomUUID();
}

const SYSTEM_PROMPT = `You are a project suggestion generator specializing in creating detailed, practical coding projects tailored to the user's interests and skill level.

Your task is to generate exactly 3 project suggestions in a JSON array format. Each project must be practical, educational, and well-defined.

Required JSON format:
[
  {
    "title": "Project Title",
    "description": "Detailed project description with overview, features, implementation steps, and potential extensions",
    "difficulty": "beginner" | "intermediate" | "advanced",
    "estimated_hours": number (realistic estimate including learning time),
    "tech_stack": ["technology1", "technology2", ...],
    "learning_outcomes": ["specific skill or concept to be learned", ...]
  },
  // ... two more project objects with the same structure
]

Guidelines:
1. Make projects practical and real-world focused
2. Include modern technologies and best practices
3. Match difficulty levels appropriately
4. Provide clear, actionable learning outcomes
5. Keep descriptions detailed but concise
6. Include both frontend and backend aspects when appropriate

Important: Ensure the response is a valid JSON array containing exactly 3 project objects.`;

serve(async (req) => {
  console.log('New request received:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  if (req.method === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    // Parse and validate request body
    const rawBody = await req.text();
    console.log('Raw request body:', rawBody);
    
    let body: ProjectGenerationParams;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return createCorsResponse({ error: 'Invalid JSON in request body' }, 400);
    }

    // Validate required fields
    if (!body.topic?.trim()) {
      return createCorsResponse({ error: 'Topic is required' }, 400);
    }

    // Construct generation prompt
    let userPrompt = `Generate 3 project suggestions for topic: ${body.topic}

Please ensure each project suggestion follows the required JSON format and includes all necessary fields.`;
    
    if (body.preferredDifficulty) {
      userPrompt += `\nPreferred difficulty level: ${body.preferredDifficulty}`;
    }
    
    if (body.preferredTech?.length) {
      userPrompt += `\nPreferred technologies: ${body.preferredTech.join(', ')}`;
    }

    console.log('Sending prompt to OpenRouter:', { systemPrompt: SYSTEM_PROMPT, userPrompt });

    try {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.4,
        max_tokens: 4000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        console.error('Empty response from OpenRouter');
        return createCorsResponse({ 
          error: 'Unable to generate projects at the moment. Please try again.' 
        }, 500);
      }

      console.log('Raw OpenRouter response:', content);

      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error('Invalid JSON format in response:', content);
        return createCorsResponse({ 
          error: 'The generated response was not in the correct format. Please try again.' 
        }, 500);
      }

      // Parse and validate suggestions
      let suggestions: ProjectSuggestion[];
      try {
        suggestions = JSON.parse(jsonMatch[0]);
        
        if (!Array.isArray(suggestions) || suggestions.length !== 3) {
          console.error('Invalid suggestions array:', suggestions);
          return createCorsResponse({ 
            error: 'Failed to generate the required number of projects. Please try again.' 
          }, 500);
        }

        // Validate each suggestion
        suggestions.forEach((suggestion, index) => {
          const validDifficulties = ['beginner', 'intermediate', 'advanced'];
          
          if (!suggestion.title?.trim()) throw new Error(`Missing title in suggestion ${index}`);
          if (!suggestion.description?.trim()) throw new Error(`Missing description in suggestion ${index}`);
          if (!validDifficulties.includes(suggestion.difficulty)) throw new Error(`Invalid difficulty in suggestion ${index}`);
          if (typeof suggestion.estimated_hours !== 'number' || suggestion.estimated_hours <= 0) throw new Error(`Invalid estimated hours in suggestion ${index}`);
          if (!Array.isArray(suggestion.tech_stack) || suggestion.tech_stack.length === 0) throw new Error(`Invalid tech stack in suggestion ${index}`);
          if (!Array.isArray(suggestion.learning_outcomes) || suggestion.learning_outcomes.length === 0) throw new Error(`Invalid learning outcomes in suggestion ${index}`);
        });
      } catch (error) {
        console.error('Error parsing/validating suggestions:', error);
        return createCorsResponse({ error: 'Failed to generate valid project suggestions' }, 500);
      }

      // Store suggestions in database
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const now = new Date().toISOString();
      const suggestionsWithIds = suggestions.map(suggestion => ({
        ...suggestion,
        id: uuidv4(),
        created_at: now,
        updated_at: now
      }));

      const { error: dbError } = await supabaseClient
        .from('project_suggestions')
        .insert(suggestionsWithIds);

      if (dbError) {
        console.error('Database error:', dbError);
        return createCorsResponse({ error: 'Failed to store project suggestions' }, 500);
      }

      return createCorsResponse({ content: suggestionsWithIds });
    } catch (error) {
      console.error('OpenRouter API error:', error);
      return createCorsResponse({ error: 'Failed to generate project suggestions' }, 500);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return createCorsResponse({ error: 'An unexpected error occurred' }, 500);
  }
}); 
