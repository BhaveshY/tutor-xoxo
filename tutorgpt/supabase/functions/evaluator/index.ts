import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createOpenAIClient, MODEL } from '../_shared/openrouter.ts';
import { createCorsResponse, handleOptionsRequest } from '../_shared/cors.ts';
import { LearnerProgress } from '../_shared/types.ts';
import { 
  analyzeLearningPace, 
  analyzeEngagement, 
  analyzePerformance 
} from '../_shared/progress-analyzer.ts';

const openai = createOpenAIClient();

const SYSTEM_PROMPT = `You are an expert learning evaluator and mentor. Your role is to analyze the learner's progress data and provide insightful, encouraging feedback and recommendations.

You will receive structured learning progress data including:
- Roadmap progress (completed topics, current topic)
- Practice sessions (with performance metrics)
- Tutor interactions (with engagement metrics)

Use this data to generate a comprehensive but concise evaluation. The data includes pre-calculated metrics for:
- Learning pace
- Engagement levels
- Performance scores

Format your response in markdown with the following sections:

# Learning Progress Evaluation

## Progress Summary
[Provide a brief overview of the learner's journey and current status, incorporating the provided metrics]

## Key Strengths
- [Strength 1 with specific examples from the data]
- [Strength 2 with specific examples from the data]
- [Add more if relevant]

## Areas for Growth
- [Area 1 with constructive feedback and specific examples]
- [Area 2 with constructive feedback and specific examples]
- [Add more if relevant]

## Recommendations
- [Specific, actionable recommendation 1 based on the data]
- [Specific, actionable recommendation 2 based on the data]
- [Add more if relevant]

Remember to:
- Be encouraging and constructive
- Focus on actionable insights
- Keep feedback specific and relevant
- Maintain a supportive tone
- Acknowledge progress made
- Reference specific achievements and challenges from the data`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    const { progressData } = await req.json();

    if (!progressData || typeof progressData !== 'object') {
      return createCorsResponse({ error: 'Valid progress data is required' }, 400);
    }

    const learnerProgress = progressData as LearnerProgress;
    
    // Analyze the progress data
    const paceAnalysis = analyzeLearningPace(learnerProgress);
    const engagementAnalysis = analyzeEngagement(
      learnerProgress.practiceSessions,
      learnerProgress.tutorInteractions
    );
    const performanceAnalysis = analyzePerformance(learnerProgress.practiceSessions);

    // Prepare the data for the LLM
    const enrichedData = {
      ...learnerProgress,
      analysis: {
        pace: paceAnalysis,
        engagement: engagementAnalysis,
        performance: performanceAnalysis
      }
    };

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(enrichedData) }
      ],
      temperature: 0.5,
      max_tokens: 2000,
    });

    return createCorsResponse({ 
      content: completion.choices[0]?.message?.content || '',
      analysis: {
        pace: paceAnalysis,
        engagement: engagementAnalysis,
        performance: performanceAnalysis
      }
    });

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return createCorsResponse({ error: errorMessage }, 500);
  }
}); 