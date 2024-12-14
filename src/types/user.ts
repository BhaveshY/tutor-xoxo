export interface UserActivity {
  id: string;
  userId: string;
  type: 'chat' | 'practice' | 'roadmap';
  content: string;
  metadata: {
    subject?: string;
    difficulty?: string;
    isCorrect?: boolean;
    score?: number;
  };
  timestamp: Date;
}

export interface UserReflection {
  id: string;
  userId: string;
  summary: string;
  strengths: string[];
  areasForImprovement: string[];
  recommendations: string[];
  subjectProgress: Record<string, number>;
  timestamp: Date;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  interests: string[];
  education: string;
  reflection?: UserReflection;
  lastReflectionDate?: Date;
} 