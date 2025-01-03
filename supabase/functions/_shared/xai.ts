export interface XAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface XAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class XAIClient {
  private apiKey: string;
  private baseUrl = 'https://api.litellm.ai/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createCompletion(params: {
    messages: XAIMessage[];
    temperature?: number;
    max_tokens?: number;
    model?: string;
  }): Promise<XAIResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://tutorgptai.com',
          'X-Title': 'TutorGPT'
        },
        body: JSON.stringify({
          model: params.model,
          messages: params.messages,
          temperature: params.temperature || 0.7,
          max_tokens: params.max_tokens || 1000,
          api_key: this.apiKey
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `API error: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      throw new Error(`LiteLLM API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 