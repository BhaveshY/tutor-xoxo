import { LearnerProgress, PracticeSession, TutorInteraction } from './types.ts';

export function analyzeLearningPace(progress: LearnerProgress): string {
  if (!progress.roadmapProgress?.completedTopics.length) {
    return 'No progress data available yet';
  }

  const topicsPerWeek = progress.roadmapProgress.completedTopics.length / 
    (Math.max(1, weeksSinceDate(progress.roadmapProgress.lastUpdated)));
  
  if (topicsPerWeek >= 3) return 'Excellent pace';
  if (topicsPerWeek >= 2) return 'Good pace';
  if (topicsPerWeek >= 1) return 'Steady pace';
  return 'Could be more consistent';
}

export function analyzeEngagement(
  practiceSessions: PracticeSession[] = [], 
  tutorInteractions: TutorInteraction[] = []
): string {
  const totalPracticeHours = practiceSessions.reduce(
    (sum, session) => sum + session.duration / 3600, 
    0
  );
  
  const totalTutorHours = tutorInteractions.reduce(
    (sum, interaction) => sum + interaction.duration / 3600, 
    0
  );

  const weeksSinceStart = Math.max(1, weeksSinceFirstActivity(practiceSessions, tutorInteractions));
  const hoursPerWeek = (totalPracticeHours + totalTutorHours) / weeksSinceStart;

  if (hoursPerWeek >= 10) return 'Highly engaged';
  if (hoursPerWeek >= 5) return 'Well engaged';
  if (hoursPerWeek >= 2) return 'Moderately engaged';
  return 'Could increase engagement';
}

export function analyzePerformance(practiceSessions: PracticeSession[] = []): string {
  if (!practiceSessions.length) return 'No practice data available yet';

  const performanceScores = {
    excellent: 4,
    good: 3,
    fair: 2,
    needs_improvement: 1
  };

  const averageScore = practiceSessions.reduce(
    (sum, session) => sum + performanceScores[session.performance], 
    0
  ) / practiceSessions.length;

  if (averageScore >= 3.5) return 'Excellent performance';
  if (averageScore >= 2.8) return 'Good performance';
  if (averageScore >= 2) return 'Fair performance';
  return 'Has room for improvement';
}

function weeksSinceDate(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
}

function weeksSinceFirstActivity(
  practiceSessions: PracticeSession[], 
  tutorInteractions: TutorInteraction[]
): number {
  const dates = [
    ...practiceSessions.map(s => new Date(s.timestamp)),
    ...tutorInteractions.map(i => new Date(i.timestamp))
  ];

  if (!dates.length) return 1;

  const firstDate = new Date(Math.min(...dates.map(d => d.getTime())));
  return weeksSinceDate(firstDate.toISOString());
} 