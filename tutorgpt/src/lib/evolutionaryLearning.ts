// Advanced types for evolutionary learning system
interface LearningMetrics {
  timeSpent: number;          // Total time spent in seconds
  attempts: number;           // Number of attempts
  successRate: number;        // Success rate (0-1)
  difficulty: number;         // Current difficulty (1-5)
  consistencyScore: number;   // How consistently the topic is practiced (0-1)
  retentionScore: number;     // Estimated knowledge retention (0-1)
  lastAttempt: Date;         // Last practice timestamp
  streakDays: number;        // Consecutive days of practice
  averageSessionTime: number; // Average time per session
}

interface PerformanceHistory {
  timestamp: Date;
  timeSpent: number;
  success: boolean;
  difficulty: number;
}

interface LearningPattern {
  topicId: string;
  metrics: LearningMetrics;
  history: PerformanceHistory[];
  relatedTopics: string[];      // IDs of related topics
  prerequisites: string[];      // IDs of prerequisite topics
  optimalTimeOfDay?: number;    // Hour (0-23) when performance is best
}

interface AdaptiveStrategy {
  topicId: string;
  recommendedTimePerSession: number;
  recommendedAttempts: number;
  suggestedDifficulty: number;
  nextReviewDate: Date;
  confidenceScore: number;      // How confident we are in these recommendations (0-1)
  alternativeStrategies: {      // Alternative strategies if main one isn't working
    timePerSession: number[];
    difficulty: number[];
  };
  prerequisitesCompleted: boolean;
}

interface LearningInsight {
  type: 'success' | 'warning' | 'info';
  message: string;
  confidence: number;
  recommendation?: string;
}

class EvolutionaryLearningSystem {
  private readonly MAX_HISTORY_ITEMS = 100;
  private readonly MIN_DATA_POINTS = 3;
  private readonly RETENTION_DECAY_RATE = 0.1;
  private readonly TIME_WEIGHTS = {
    RECENT: 0.6,
    HISTORICAL: 0.4
  };

  private learningPatterns: Map<string, LearningPattern> = new Map();
  private adaptiveStrategies: Map<string, AdaptiveStrategy> = new Map();
  
  // Initialize a new learning pattern with default values
  private initializeLearningPattern(topicId: string): LearningPattern {
    return {
      topicId,
      metrics: {
        timeSpent: 0,
        attempts: 0,
        successRate: 0,
        difficulty: 3,
        consistencyScore: 0,
        retentionScore: 0,
        lastAttempt: new Date(),
        streakDays: 0,
        averageSessionTime: 0
      },
      history: [],
      relatedTopics: [],
      prerequisites: []
    };
  }

  // Update learning pattern with new data
  updateLearningPattern(
    topicId: string,
    timeSpent: number,
    success: boolean,
    relatedTopics: string[] = [],
    prerequisites: string[] = []
  ): void {
    try {
      const existing = this.learningPatterns.get(topicId) || this.initializeLearningPattern(topicId);
      const now = new Date();

      // Update history
      const newHistoryEntry: PerformanceHistory = {
        timestamp: now,
        timeSpent,
        success,
        difficulty: existing.metrics.difficulty
      };

      const updatedHistory = [newHistoryEntry, ...existing.history]
        .slice(0, this.MAX_HISTORY_ITEMS);

      // Calculate new metrics
      const newMetrics = this.calculateMetrics(existing.metrics, {
        timeSpent,
        success,
        timestamp: now,
        history: updatedHistory
      });

      // Update pattern
      const updatedPattern: LearningPattern = {
        ...existing,
        metrics: newMetrics,
        history: updatedHistory,
        relatedTopics: [...new Set([...existing.relatedTopics, ...relatedTopics])],
        prerequisites: [...new Set([...existing.prerequisites, ...prerequisites])]
      };

      this.learningPatterns.set(topicId, updatedPattern);
      this.evolveStrategy(topicId);
    } catch (error) {
      console.error('Error updating learning pattern:', error);
      throw new Error('Failed to update learning pattern');
    }
  }

  // Calculate new metrics based on history
  private calculateMetrics(
    currentMetrics: LearningMetrics,
    update: {
      timeSpent: number;
      success: boolean;
      timestamp: Date;
      history: PerformanceHistory[];
    }
  ): LearningMetrics {
    const { timeSpent, success, timestamp, history } = update;

    // Calculate basic metrics
    const attempts = currentMetrics.attempts + 1;
    const totalTimeSpent = currentMetrics.timeSpent + timeSpent;
    const averageSessionTime = totalTimeSpent / attempts;

    // Calculate weighted success rate (recent attempts count more)
    const weightedSuccesses = history.reduce((acc, entry, index) => {
      const weight = Math.exp(-index * 0.1); // Exponential decay
      return acc + (entry.success ? weight : 0);
    }, 0);

    const weightedTotal = history.reduce((acc, _, index) => {
      return acc + Math.exp(-index * 0.1);
    }, 0);

    const successRate = weightedSuccesses / weightedTotal;

    // Calculate consistency score
    const dayStreak = this.calculateDayStreak(history);
    const consistencyScore = Math.min(dayStreak / 7, 1); // Normalize to 0-1

    // Calculate retention score
    const retentionScore = this.calculateRetentionScore(history);

    return {
      timeSpent: totalTimeSpent,
      attempts,
      successRate,
      difficulty: this.calculateDifficulty(successRate, history),
      consistencyScore,
      retentionScore,
      lastAttempt: timestamp,
      streakDays: dayStreak,
      averageSessionTime
    };
  }

  // Calculate optimal learning strategy
  private evolveStrategy(topicId: string): void {
    const pattern = this.learningPatterns.get(topicId);
    if (!pattern || pattern.history.length < this.MIN_DATA_POINTS) return;

    try {
      const prerequisites = this.checkPrerequisites(pattern);
      const timeRecommendation = this.calculateOptimalTime(pattern);
      const difficultyRecommendation = this.calculateOptimalDifficulty(pattern);
      const nextReview = this.calculateNextReview(pattern);
      const confidenceScore = this.calculateConfidenceScore(pattern);

      const strategy: AdaptiveStrategy = {
        topicId,
        recommendedTimePerSession: timeRecommendation.optimal,
        recommendedAttempts: this.calculateOptimalAttempts(pattern),
        suggestedDifficulty: difficultyRecommendation.optimal,
        nextReviewDate: nextReview,
        confidenceScore,
        alternativeStrategies: {
          timePerSession: timeRecommendation.alternatives,
          difficulty: difficultyRecommendation.alternatives
        },
        prerequisitesCompleted: prerequisites.completed
      };

      this.adaptiveStrategies.set(topicId, strategy);
    } catch (error) {
      console.error('Error evolving strategy:', error);
      // Don't throw - allow system to continue with old strategy
    }
  }

  // Get learning recommendations for a topic
  getRecommendations(topicId: string): {
    strategy: AdaptiveStrategy | null;
    insights: LearningInsight[];
  } {
    const strategy = this.adaptiveStrategies.get(topicId);
    const pattern = this.learningPatterns.get(topicId);
    
    if (!pattern || !strategy) return { strategy: null, insights: [] };

    const insights = this.generateInsights(pattern, strategy);
    return { strategy, insights };
  }

  // Private helper methods
  private calculateDifficulty(successRate: number, history: PerformanceHistory[]): number {
    if (history.length < this.MIN_DATA_POINTS) return 3;

    // Calculate trend
    const recentSuccess = history
      .slice(0, 5)
      .reduce((acc, entry) => acc + (entry.success ? 1 : 0), 0) / Math.min(5, history.length);

    // Calculate volatility
    const volatility = this.calculateVolatility(history.map(h => h.success));

    // Adjust difficulty based on success rate, trend, and volatility
    let difficulty = 3;
    
    if (successRate > 0.8 && recentSuccess > 0.8 && volatility < 0.3) {
      difficulty = Math.min(5, difficulty + 1);
    } else if (successRate < 0.4 || (recentSuccess < 0.3 && volatility < 0.3)) {
      difficulty = Math.max(1, difficulty - 1);
    }

    return this.lerp(difficulty, history[0].difficulty, 0.7); // Smooth transitions
  }

  private calculateOptimalTime(pattern: LearningPattern): {
    optimal: number;
    alternatives: number[];
  } {
    const { history, metrics } = pattern;
    
    // Find sessions with high success rate
    const successfulSessions = history.filter(h => h.success);
    if (successfulSessions.length === 0) {
      return { optimal: 600, alternatives: [300, 900] }; // Default values
    }

    // Calculate optimal time based on successful sessions
    const times = successfulSessions.map(s => s.timeSpent);
    const optimal = Math.round(
      times.reduce((a, b) => a + b, 0) / times.length
    );

    // Generate alternatives around the optimal time
    const alternatives = [
      Math.round(optimal * 0.75),
      Math.round(optimal * 1.25)
    ];

    return { optimal, alternatives };
  }

  private calculateOptimalDifficulty(pattern: LearningPattern): {
    optimal: number;
    alternatives: number[];
  } {
    const { metrics, history } = pattern;

    // Base difficulty on recent performance
    let optimal = metrics.difficulty;
    
    // Adjust based on retention and consistency
    if (metrics.retentionScore > 0.8 && metrics.consistencyScore > 0.7) {
      optimal = Math.min(5, optimal + 0.5);
    } else if (metrics.retentionScore < 0.4 || metrics.consistencyScore < 0.3) {
      optimal = Math.max(1, optimal - 0.5);
    }

    // Generate alternatives
    const alternatives = [
      Math.max(1, Math.round(optimal - 1)),
      Math.min(5, Math.round(optimal + 1))
    ];

    return { optimal: Math.round(optimal), alternatives };
  }

  private calculateNextReview(pattern: LearningPattern): Date {
    const { metrics, history } = pattern;
    const now = new Date();

    // Calculate base interval using spaced repetition
    let interval = this.calculateSpacedInterval(
      metrics.successRate,
      metrics.retentionScore,
      history.length
    );

    // Adjust interval based on consistency
    interval *= 1 + (metrics.consistencyScore * 0.5);

    // Add random variation (±10%)
    const variation = 1 + (Math.random() * 0.2 - 0.1);
    interval *= variation;

    const nextReview = new Date(now);
    nextReview.setDate(nextReview.getDate() + Math.round(interval));
    return nextReview;
  }

  private calculateSpacedInterval(
    successRate: number,
    retentionScore: number,
    repetitions: number
  ): number {
    // Base interval using SuperMemo-2 inspired algorithm
    const baseInterval = Math.pow(2, repetitions - 1);
    
    // Adjust based on success and retention
    const performanceFactor = (successRate + retentionScore) / 2;
    const adjustedInterval = baseInterval * performanceFactor;

    // Constrain to reasonable bounds
    return Math.min(Math.max(1, adjustedInterval), 30); // 1-30 days
  }

  private calculateRetentionScore(history: PerformanceHistory[]): number {
    if (history.length === 0) return 0;

    const now = new Date();
    return history.reduce((score, entry, index) => {
      const daysSince = (now.getTime() - entry.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      const decayFactor = Math.exp(-daysSince * this.RETENTION_DECAY_RATE);
      const weight = Math.exp(-index * 0.1); // More recent entries count more
      return score + (entry.success ? decayFactor * weight : 0);
    }, 0) / history.length;
  }

  private calculateDayStreak(history: PerformanceHistory[]): number {
    if (history.length === 0) return 0;

    let streak = 1;
    const now = new Date();
    const oneDayMs = 24 * 60 * 60 * 1000;

    // Check if most recent attempt was today or yesterday
    const daysSinceLastAttempt = (now.getTime() - history[0].timestamp.getTime()) / oneDayMs;
    if (daysSinceLastAttempt > 2) return 0;

    // Calculate streak
    for (let i = 1; i < history.length; i++) {
      const daysBetween = (history[i - 1].timestamp.getTime() - history[i].timestamp.getTime()) / oneDayMs;
      if (daysBetween <= 2) streak++;
      else break;
    }

    return streak;
  }

  private calculateVolatility(successes: boolean[]): number {
    if (successes.length < 2) return 0;
    
    let changes = 0;
    for (let i = 1; i < successes.length; i++) {
      if (successes[i] !== successes[i - 1]) changes++;
    }
    
    return changes / (successes.length - 1);
  }

  private checkPrerequisites(pattern: LearningPattern): {
    completed: boolean;
    missing: string[];
  } {
    const missing = pattern.prerequisites.filter(preId => {
      const prePattern = this.learningPatterns.get(preId);
      return !prePattern || prePattern.metrics.successRate < 0.7;
    });

    return {
      completed: missing.length === 0,
      missing
    };
  }

  private calculateConfidenceScore(pattern: LearningPattern): number {
    const { history, metrics } = pattern;
    
    // Factors affecting confidence
    const dataPoints = Math.min(history.length / this.MIN_DATA_POINTS, 1);
    const consistency = metrics.consistencyScore;
    const volatility = this.calculateVolatility(history.map(h => h.success));
    const recency = Math.exp(-this.daysSince(metrics.lastAttempt) * 0.1);

    return (dataPoints + consistency + (1 - volatility) + recency) / 4;
  }

  private generateInsights(
    pattern: LearningPattern,
    strategy: AdaptiveStrategy
  ): LearningInsight[] {
    const insights: LearningInsight[] = [];
    const { metrics } = pattern;

    // Performance insights
    if (metrics.successRate > 0.8 && metrics.consistencyScore > 0.7) {
      insights.push({
        type: 'success',
        message: 'Excellent progress! Consider increasing difficulty.',
        confidence: 0.9,
        recommendation: 'Try more challenging exercises'
      });
    }

    // Time management insights
    if (metrics.averageSessionTime > strategy.recommendedTimePerSession * 1.5) {
      insights.push({
        type: 'warning',
        message: 'Sessions might be too long for optimal learning.',
        confidence: 0.8,
        recommendation: 'Try shorter, more focused sessions'
      });
    }

    // Consistency insights
    if (metrics.consistencyScore < 0.3) {
      insights.push({
        type: 'info',
        message: 'More regular practice would improve retention.',
        confidence: 0.85,
        recommendation: 'Aim for daily short practice sessions'
      });
    }

    return insights;
  }

  private daysSince(date: Date): number {
    return (new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * Math.max(0, Math.min(1, t));
  }

  private calculateOptimalAttempts(pattern: LearningPattern): number {
    const { metrics, history } = pattern;
    
    // Base number of attempts based on difficulty and retention
    const baseAttempts = Math.ceil((6 - metrics.difficulty) * (1 - metrics.retentionScore));
    
    // Adjust based on consistency
    const consistencyFactor = 1 + (1 - metrics.consistencyScore);
    
    // Calculate final recommendation
    return Math.max(1, Math.min(5, Math.round(baseAttempts * consistencyFactor)));
  }

  // Debug and analytics methods
  getAnalytics(topicId: string) {
    const pattern = this.learningPatterns.get(topicId);
    const strategy = this.adaptiveStrategies.get(topicId);
    
    if (!pattern || !strategy) return null;

    return {
      pattern,
      strategy,
      insights: this.generateInsights(pattern, strategy)
    };
  }

  getAllPatterns(): LearningPattern[] {
    return Array.from(this.learningPatterns.values());
  }
}

export const evolutionaryLearning = new EvolutionaryLearningSystem(); 