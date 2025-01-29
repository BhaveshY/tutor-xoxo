import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { createOpenAIClient, MODEL } from '../_shared/openrouter.ts'
import { createCorsResponse, handleOptionsRequest } from '../_shared/cors.ts'

const openai = createOpenAIClient();

const SYSTEM_PROMPT = `You are a project suggestion generator. Generate detailed project suggestions based on the user's topic of interest.

Each project suggestion should include:
1. Title: A clear, concise title
2. Description: A detailed description of the project
3. Difficulty: One of: beginner, intermediate, advanced
4. Estimated Hours: Realistic time estimate to complete
5. Tech Stack: Array of technologies/tools needed
6. Learning Outcomes: Array of skills/concepts to be learned

Format each project as a JSON object with these exact fields:
{
  "title": string,
  "description": string,
  "difficulty": "beginner" | "intermediate" | "advanced",
  "estimated_hours": number,
  "tech_stack": string[],
  "learning_outcomes": string[]
}

Generate exactly 3 project suggestions in a JSON array.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    const { topic } = await req.json();

    if (!topic) {
      return createCorsResponse({ error: 'Topic is required' }, 400);
    }

    // If it's a generation request
    if (topic) {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Generate 3 project suggestions for: ${topic}` }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const content = completion.choices[0]?.message?.content || '';
      
      try {
        const suggestions = JSON.parse(content);
        if (!Array.isArray(suggestions) || suggestions.length !== 3) {
          throw new Error('Invalid response format');
        }

        // Validate each suggestion
        suggestions.forEach((suggestion, index) => {
          if (!suggestion.title || !suggestion.description || 
              !suggestion.difficulty || !suggestion.estimated_hours ||
              !Array.isArray(suggestion.tech_stack) || !Array.isArray(suggestion.learning_outcomes)) {
            throw new Error(`Invalid suggestion format at index ${index}`);
          }
        });

        // Store suggestions in the database
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { error: dbError } = await supabaseClient
          .from('project_suggestions')
          .insert(suggestions);

        if (dbError) {
          throw dbError;
        }

        return createCorsResponse({ content: suggestions });
      } catch (parseError) {
        console.error('Error parsing suggestions:', parseError);
        return createCorsResponse({ error: 'Failed to generate valid project suggestions' }, 500);
      }
    }

    // If it's a fetch request (no topic provided in body)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: suggestions, error: dbError } = await supabaseClient
      .from('project_suggestions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);

    if (dbError) {
      throw dbError;
    }

    return createCorsResponse({ content: suggestions });
  } catch (err) {
    console.error('Error:', err);
    const error = err as Error;
    return createCorsResponse({ error: error.message }, 500);
  }
}); 
