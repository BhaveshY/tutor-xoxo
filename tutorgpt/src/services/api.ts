import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface LLMRequest {
  prompt: string;
  mode: 'tutor' | 'roadmap' | 'practice';
  context?: string;
}

export const llmService = {
  async generateResponse(data: LLMRequest) {
    try {
      // TODO: Replace with actual API endpoint
      const response = await axios.post(`${API_URL}/api/generate`, data);
      return response.data;
    } catch (error) {
      console.error('Error generating response:', error);
      throw error;
    }
  },

  async generateQuestions(topic: string) {
    try {
      const response = await axios.post(`${API_URL}/api/questions`, { topic });
      return response.data;
    } catch (error) {
      console.error('Error generating questions:', error);
      throw error;
    }
  },

  async generateRoadmap(goals: string) {
    try {
      const response = await axios.post(`${API_URL}/api/roadmap`, { goals });
      return response.data;
    } catch (error) {
      console.error('Error generating roadmap:', error);
      throw error;
    }
  },
}; 