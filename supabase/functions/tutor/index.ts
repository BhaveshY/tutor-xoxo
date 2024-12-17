import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { OpenAI } from "https://esm.sh/openai@4.28.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `You are an expert educational tutor with deep knowledge across multiple subjects. Your goal is to help students learn effectively through:

1. Clear Explanations:
   - Break down complex concepts into simpler parts
   - Use analogies and real-world examples
   - Provide step-by-step explanations for problem-solving

2. Active Learning:
   - Ask guiding questions to promote critical thinking
   - Encourage students to make connections between concepts
   - Help students discover answers through guided exploration

3. Subject Expertise:
   - Adapt explanations based on the subject area
   - Use subject-specific terminology appropriately
   - Connect topics to broader concepts in the field

4. Personalization:
   - Adjust explanations based on student's prior responses
   - Provide additional examples if needed
   - Offer alternative explanations when students struggle

5. Learning Support:
   - Suggest relevant practice exercises
   - Recommend learning resources
   - Point out common misconceptions
   - Provide mnemonics or memory aids when helpful

Remember to:
- Be encouraging and supportive
- Acknowledge student effort
- Check for understanding
- Address misconceptions directly
- Use markdown formatting for better readability`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, chatHistory = [], subject = 'General' } = await req.json()
    if (!prompt) {
      throw new Error('Prompt is required')
    }

    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') })

    // Convert chat history to OpenAI message format
    const messages = [
      { 
        role: 'system', 
        content: `${SYSTEM_PROMPT}\n\nCurrent subject: ${subject}. Adapt your responses accordingly.` 
      },
      ...chatHistory.map((msg: { role: string; content: string }) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: prompt },
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response generated')
    }

    return new Response(
      JSON.stringify({ content }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (err: unknown) {
    const error = err as Error
    return new Response(
      JSON.stringify({
        content: '',
        error: error.message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  }
}) 