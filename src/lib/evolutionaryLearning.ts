// Types for evolutionary learning
interface LearningPattern {
  topicId: string;
  timeSpent: number;
  attempts: number;
  successRate: number;
  difficulty: number;
  lastAttempt: Date;
}

interface AdaptiveStrategy {
  topicId: string;
  recommendedTimePerSession: number;
  recommendedAttempts: number;
  suggestedDifficulty: number;
  nextReviewDate: Date;
}

class EvolutionaryLearningSystem {
  private learningPatterns: Map<string, LearningPattern> = new Map();
  private adaptiveStrategies: Map<string, AdaptiveStrategy> = new Map();
  
  // Add a new learning pattern or update existing one
  updateLearningPattern(
    topicId: string,
    timeSpent: number,
    success: boolean
  ): void {
    const existing = this.learningPatterns.get(topicId) || {
      topicId,
      timeSpent: 0,
      attempts: 0,
      successRate: 0,
      difficulty: 1,
      lastAttempt: new Date()
    };

    const newPattern: LearningPattern = {
      ...existing,
      timeSpent: existing.timeSpent + timeSpent,
      attempts: existing.attempts + 1,
      successRate: ((existing.successRate * existing.attempts) + (success ? 1 : 0)) / (existing.attempts + 1),
      lastAttempt: new Date()
    };

    // Adjust difficulty based on success rate
    newPattern.difficulty = this.calculateDifficulty(newPattern.successRate);
    
    this.learningPatterns.set(topicId, newPattern);
    this.evolveStrategy(topicId);
  }

  // Calculate optimal learning strategy based on patterns
  private evolveStrategy(topicId: string): void {
    const pattern = this.learningPatterns.get(topicId);
    if (!pattern) return;

    const strategy: AdaptiveStrategy = {
      topicId,
      recommendedTimePerSession: this.calculateOptimalTime(pattern),
      recommendedAttempts: this.calculateOptimalAttempts(pattern),
      suggestedDifficulty: pattern.difficulty,
      nextReviewDate: this.calculateNextReview(pattern)
    };

    this.adaptiveStrategies.set(topicId, strategy);
  }

  // Get learning recommendations for a topic
  getRecommendations(topicId: string): AdaptiveStrategy | null {
    return this.adaptiveStrategies.get(topicId) || null;
  }

  // Get all learning patterns
  getAllPatterns(): LearningPattern[] {
    return Array.from(this.learningPatterns.values());
  }

  // Private helper methods
  private calculateDifficulty(successRate: number): number {
    if (successRate > 0.8) return Math.max(1, this.lerp(3, 1, (successRate - 0.8) * 5));
    if (successRate < 0.4) return Math.min(5, this.lerp(3, 5, (0.4 - successRate) * 2.5));
    return 3;
  }

  private calculateOptimalTime(pattern: LearningPattern): number {
    const baseTime = pattern.timeSpent / pattern.attempts;
    const difficultyFactor = pattern.difficulty / 3;
    return Math.round(baseTime * difficultyFactor);
  }

  private calculateOptimalAttempts(pattern: LearningPattern): number {
    return Math.max(1, Math.ceil(5 - pattern.successRate * 3));
  }

  private calculateNextReview(pattern: LearningPattern): Date {
    const now = new Date();
    const daysSinceLastAttempt = (now.getTime() - pattern.lastAttempt.getTime()) / (1000 * 60 * 60 * 24);
    
    // Use spaced repetition algorithm
    const interval = this.calculateSpacedInterval(pattern.successRate, daysSinceLastAttempt);
    
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);
    return nextReview;
  }

  private calculateSpacedInterval(successRate: number, daysSinceLastAttempt: number): number {
    const baseInterval = Math.max(1, daysSinceLastAttempt);
    if (successRate > 0.8) return baseInterval * 2;
    if (successRate < 0.4) return 1;
    return baseInterval * 1.5;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * Math.max(0, Math.min(1, t));
  }
}

export const evolutionaryLearning = new EvolutionaryLearningSystem(); 