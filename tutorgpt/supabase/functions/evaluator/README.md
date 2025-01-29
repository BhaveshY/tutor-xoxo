# Learning Progress Evaluator

This endpoint provides comprehensive learning progress evaluation based on various learning activities and metrics.

## Usage

Send a POST request to the endpoint with the following data structure:

```typescript
{
  "progressData": {
    "userId": string,
    "roadmapProgress?: {
      "completedTopics": string[],
      "currentTopic": string,
      "lastUpdated": string  // ISO date string
    },
    "practiceSessions?": [{
      "timestamp": string,   // ISO date string
      "topic": string,
      "duration": number,    // in seconds
      "performance": "excellent" | "good" | "fair" | "needs_improvement",
      "notes?": string
    }],
    "tutorInteractions?": [{
      "timestamp": string,   // ISO date string
      "topic": string,
      "messageCount": number,
      "duration": number,    // in seconds
      "understanding": "high" | "medium" | "low"
    }],
    "lastEvaluation?": string  // ISO date string
  }
}
```

## Response

The endpoint returns:

```typescript
{
  "content": string,  // Markdown formatted evaluation
  "analysis": {
    "pace": string,
    "engagement": string,
    "performance": string
  }
}
```

## Example Response Content

```markdown
# Learning Progress Evaluation

## Progress Summary
Overview of learning journey incorporating pace, engagement, and performance metrics...

## Key Strengths
- Strength 1 with specific examples
- Strength 2 with specific examples

## Areas for Growth
- Area 1 with constructive feedback
- Area 2 with constructive feedback

## Recommendations
- Specific, actionable recommendation 1
- Specific, actionable recommendation 2
```

## Error Handling

The endpoint returns appropriate error messages for:
- Missing or invalid progress data
- Internal processing errors
- API errors

All errors follow the format:
```typescript
{
  "error": string
}
``` 