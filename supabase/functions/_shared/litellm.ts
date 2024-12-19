export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LiteLLMResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface ModelConfig {
  api_key: string;
  model: string;
  provider: string;
}

export class LiteLLMClient {
  private modelConfigs: Record<string, ModelConfig>;
  private baseUrl: string;

  constructor(apiKeys: Record<string, string>) {
    if (!apiKeys) {
      throw new Error('API keys are required');
    }

    // Initialize model configurations with provider-specific model names and providers
    this.modelConfigs = {
      'gpt-4-turbo-preview': {
        api_key: apiKeys.OPENAI_API_KEY,
        model: 'gpt-4-turbo-preview',
        provider: 'openai'
      },
      'grok-2-1212': {
        api_key: apiKeys.XAI_API_KEY,
        model: 'grok-2-1212',
        provider: 'groq'
      },
      'claude-3-5-sonnet-20241022': {
        api_key: apiKeys.ANTHROPIC_API_KEY,
        model: 'claude-3-5-sonnet-20241022',
        provider: 'anthropic'
      },
      'gemini-pro': {
        api_key: apiKeys.GOOGLE_API_KEY,
        model: 'google/gemini-pro',
        provider: 'google'
      }
    };

    this.baseUrl = 'https://api.litellm.ai/v1';
  }

  private getModelConfig(model: string): ModelConfig {
    const config = this.modelConfigs[model];
    if (!config) {
      throw new Error(`Model ${model} not supported`);
    }
    return config;
  }

  async createCompletion(params: {
    model: string;
    messages: Message[];
    temperature?: number;
    max_tokens?: number;
  }): Promise<LiteLLMResponse> {
    try {
      const modelConfig = this.getModelConfig(params.model);
      
      // Validate that we have the correct API key for the selected provider
      if (!modelConfig.api_key) {
        throw new Error(`API key not found for provider ${modelConfig.provider}`);
      }

      const requestBody = {
        model: modelConfig.model,
        messages: params.messages,
        temperature: params.temperature || 0.7,
        max_tokens: params.max_tokens || 2000,
        provider: modelConfig.provider  // Explicitly specify the provider
      };

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${modelConfig.api_key}`,
          'HTTP-Referer': 'https://tutorgptai.com',
          'X-Title': 'TutorGPT',
          'X-Provider': modelConfig.provider
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('LiteLLM API error response:', error);
        throw new Error(error.message || `LiteLLM API error: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('LiteLLM API error:', error);
      throw new Error(`LiteLLM API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async validateEnvironment(model: string): Promise<boolean> {
    const config = this.getModelConfig(model);
    return !!config.api_key;
  }
} 