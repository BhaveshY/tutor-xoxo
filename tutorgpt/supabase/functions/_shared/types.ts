// Types for learning progress evaluation

export interface RoadmapProgress {
  completedTopics: string[];
  currentTopic: string;
  lastUpdated: string;
}

export interface PracticeSession {
  timestamp: string;
  topic: string;
  duration: number;
  performance: 'excellent' | 'good' | 'fair' | 'needs_improvement';
  notes?: string;
}

export interface TutorInteraction {
  timestamp: string;
  topic: string;
  messageCount: number;
  duration: number;
  understanding: 'high' | 'medium' | 'low';
}

export interface LearnerProgress {
  userId: string;
  roadmapProgress?: RoadmapProgress;
  practiceSessions?: PracticeSession[];
  tutorInteractions?: TutorInteraction[];
  lastEvaluation?: string;
} 