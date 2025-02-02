import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createOpenAIClient, MODEL } from '../_shared/openrouter.ts';
import { createCorsResponse, handleOptionsRequest } from '../_shared/cors.ts';

let openai;
try {
  openai = createOpenAIClient();
} catch (error) {
  console.error('Failed to initialize OpenRouter client:', error);
  throw error;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    // Validate content type
    const contentType = req.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return createCorsResponse({ error: 'Content-Type must be application/json' }, 400);
    }

    // Parse and validate request body
    const body = await req.json().catch(() => null);
    if (!body) {
      return createCorsResponse({ error: 'Invalid JSON body' }, 400);
    }

    const { prompt, chatHistory = [] } = body;

    if (!prompt || typeof prompt !== 'string') {
      return createCorsResponse({ error: 'Prompt is required and must be a string' }, 400);
    }

    if (!Array.isArray(chatHistory)) {
      return createCorsResponse({ error: 'chatHistory must be an array' }, 400);
    }

    try {
      console.log('Making OpenRouter API call with model:', MODEL);
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a knowledgeable and patient tutor with perfect memory of the conversation context. You should maintain context of the conversation and refer back to previous interactions when relevant. When the user mentions something previously discussed, acknowledge it. If the user shares personal information (like their name), remember and use it appropriately. Explain concepts clearly and provide examples when helpful. If you are unsure about something, admit it and suggest reliable sources for further learning.'
          },
          ...chatHistory,
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      if (!completion.choices?.[0]?.message?.content) {
        console.error('Invalid response from OpenRouter:', completion);
        return createCorsResponse({ error: 'Invalid response from OpenRouter API' }, 502);
      }

      return createCorsResponse({ content: completion.choices[0].message.content });
    } catch (apiError) {
      console.error('OpenRouter API error:', {
        name: apiError.name,
        message: apiError.message,
        stack: apiError.stack,
        cause: apiError.cause
      });
      
      // Check for specific OpenRouter error types
      if (apiError.message?.includes('authentication')) {
        return createCorsResponse({ error: 'OpenRouter API authentication failed' }, 502);
      }
      if (apiError.message?.includes('model')) {
        return createCorsResponse({ error: 'Invalid or unavailable model specified' }, 502);
      }
      
      return createCorsResponse({ 
        error: apiError instanceof Error 
          ? `OpenRouter API error: ${apiError.message}` 
          : 'Failed to get completion from OpenRouter'
      }, 502);
    }

  } catch (error: unknown) {
    console.error('Unexpected error:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return createCorsResponse({ error: errorMessage }, 500);
  }
}); 