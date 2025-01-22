export type LLMModel = 'deepseek/deepseek-r1';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function callOpenRouter(messages: Message[]): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
      'HTTP-Referer': 'https://tutorgptai.com',
      'X-Title': 'TutorGPT'
    },
    body: JSON.stringify({
      model: 'deepseek/deepseek-r1',
      messages,
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `OpenRouter API error: ${response.statusText}`);
  }

  const data: OpenRouterResponse = await response.json();
  return data.choices[0].message.content;
} 