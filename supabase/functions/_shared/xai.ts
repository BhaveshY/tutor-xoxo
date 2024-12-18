export interface XAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class XAIClient {
  private apiKey: string;
  private baseUrl = 'https://docs.x.ai/api'; // Replace with actual xAI API endpoint

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createCompletion(params: {
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    max_tokens?: number;
  }): Promise<XAIResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'grok-2',
        ...params
      })
    });

    if (!response.ok) {
      throw new Error(`xAI API error: ${response.statusText}`);
    }

    return response.json();
  }
} 