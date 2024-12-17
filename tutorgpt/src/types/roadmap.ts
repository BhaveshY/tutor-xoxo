export interface RoadmapSubtopic {
  id: string;
  title: string;
  completed: boolean;
}

export interface RoadmapTopic {
  id: string;
  title: string;
  subtopics: RoadmapSubtopic[];
  completed: boolean;
}

export interface Roadmap {
  id: string;
  title: string;
  content: string;
  timestamp: Date;
  topics: RoadmapTopic[];
  progress: number;
}

export interface TopicMetrics {
  timeSpent: number;
  attempts: number;
  successRate: number;
  difficulty: number;
  lastAttempt: Date;
  subtopics: Record<string, { completed: boolean }>;
  lastAttemptTimestamp: number;
  averageTimePerSubtopic: number;
  consistencyScore: number;
  retentionRate: number;
}

export interface RoadmapMetrics {
  roadmapId: string;
  topicMetrics: Record<string, TopicMetrics>;
  lastUpdated: Date;
} 