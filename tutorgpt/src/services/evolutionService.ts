import { RoadmapTopic } from '../types/roadmap.ts';

interface LearningMetrics {
  completionTime: number;
  attemptsCount: number;
  successRate: number;
  difficultyRating: number;
  lastAttemptTimestamp?: number;
  averageTimePerSubtopic?: number;
  consistencyScore?: number;
  retentionRate?: number;
}

interface TopicPerformance {
  topicId: string;
  metrics: LearningMetrics;
}

interface Population {
  chromosome: RoadmapTopic[];
  fitness: number;
}

interface TopicRelationship {
  prerequisite: string;
  dependent: string;
  strength: number; // 0 to 1
}

export class EvolutionaryOptimizer {
  private populationSize: number;
  private mutationRate: number;
  private crossoverRate: number;
  private elitismCount: number;
  private maxGenerations: number;
  private topicRelationships: TopicRelationship[];
  private learningPatternWeight: number;
  private difficultyProgressionWeight: number;
  private timeManagementWeight: number;
  private retentionWeight: number;

  constructor(
    populationSize = 50,
    mutationRate = 0.1,
    crossoverRate = 0.8,
    elitismCount = 2,
    maxGenerations = 100
  ) {
    this.populationSize = populationSize;
    this.mutationRate = mutationRate;
    this.crossoverRate = crossoverRate;
    this.elitismCount = elitismCount;
    this.maxGenerations = maxGenerations;
    this.topicRelationships = [];
    this.learningPatternWeight = 0.3;
    this.difficultyProgressionWeight = 0.25;
    this.timeManagementWeight = 0.25;
    this.retentionWeight = 0.2;
  }

  private calculateConsistencyScore(metrics: LearningMetrics): number {
    if (!metrics.lastAttemptTimestamp || !metrics.averageTimePerSubtopic) return 0.5;
    
    const daysSinceLastAttempt = (Date.now() - metrics.lastAttemptTimestamp) / (1000 * 60 * 60 * 24);
    const regularityScore = Math.max(0, 1 - (daysSinceLastAttempt / 14)); // Penalize if more than 2 weeks
    
    const timeConsistency = metrics.averageTimePerSubtopic > 0 
      ? Math.min(1, 30 / metrics.averageTimePerSubtopic) // Ideal time: 30 minutes per subtopic
      : 0;

    return (regularityScore + timeConsistency) / 2;
  }

  private calculateRetentionScore(metrics: LearningMetrics): number {
    if (!metrics.retentionRate) return 0.5;
    
    // Consider both retention rate and time since last attempt
    const baseRetention = metrics.retentionRate;
    const timeFactor = metrics.lastAttemptTimestamp 
      ? Math.exp(-(Date.now() - metrics.lastAttemptTimestamp) / (30 * 24 * 60 * 60 * 1000)) // Decay over 30 days
      : 1;

    return baseRetention * timeFactor;
  }

  private calculateDifficultyProgression(chromosome: RoadmapTopic[], performances: TopicPerformance[]): number {
    let progressionScore = 0;
    
    for (let i = 1; i < chromosome.length; i++) {
      const currentPerf = performances.find(p => p.topicId === chromosome[i].id);
      const prevPerf = performances.find(p => p.topicId === chromosome[i-1].id);
      
      if (currentPerf && prevPerf) {
        // Ideal: Gradual increase in difficulty (0.1-0.2 difference)
        const difficultyDiff = currentPerf.metrics.difficultyRating - prevPerf.metrics.difficultyRating;
        const idealDiff = 0.15;
        progressionScore += 1 - Math.abs(difficultyDiff - idealDiff);
      }
    }
    
    return progressionScore / (chromosome.length - 1);
  }

  private analyzeTopicRelationships(topics: RoadmapTopic[], performances: TopicPerformance[]) {
    this.topicRelationships = [];
    
    // Analyze completion patterns
    for (let i = 0; i < topics.length; i++) {
      for (let j = i + 1; j < topics.length; j++) {
        const topic1Perf = performances.find(p => p.topicId === topics[i].id);
        const topic2Perf = performances.find(p => p.topicId === topics[j].id);
        
        if (topic1Perf && topic2Perf) {
          // Check if success in topic1 correlates with success in topic2
          const successCorrelation = Math.abs(topic1Perf.metrics.successRate - topic2Perf.metrics.successRate);
          if (successCorrelation < 0.3) { // Strong correlation
            this.topicRelationships.push({
              prerequisite: topics[i].id,
              dependent: topics[j].id,
              strength: 1 - successCorrelation
            });
          }
        }
      }
    }
  }

  private calculateFitness(chromosome: RoadmapTopic[], performances: TopicPerformance[]): number {
    let fitness = 0;
    
    // 1. Learning Pattern Score (30%)
    let learningPatternScore = 0;
    for (let i = 0; i < chromosome.length; i++) {
      const performance = performances.find(p => p.topicId === chromosome[i].id);
      if (performance) {
        const consistency = this.calculateConsistencyScore(performance.metrics);
        learningPatternScore += consistency;
      }
    }
    learningPatternScore /= chromosome.length;
    
    // 2. Difficulty Progression Score (25%)
    const difficultyScore = this.calculateDifficultyProgression(chromosome, performances);
    
    // 3. Time Management Score (25%)
    let timeManagementScore = 0;
    for (const performance of performances) {
      if (performance.metrics.averageTimePerSubtopic) {
        // Ideal time per subtopic: 20-40 minutes
        const timeScore = performance.metrics.averageTimePerSubtopic >= 20 && 
                         performance.metrics.averageTimePerSubtopic <= 40 ? 1 :
                         Math.max(0, 1 - Math.abs(30 - performance.metrics.averageTimePerSubtopic) / 30);
        timeManagementScore += timeScore;
      }
    }
    timeManagementScore /= performances.length;
    
    // 4. Retention Score (20%)
    let retentionScore = 0;
    for (const performance of performances) {
      retentionScore += this.calculateRetentionScore(performance.metrics);
    }
    retentionScore /= performances.length;
    
    // 5. Topic Relationships Penalty
    let relationshipPenalty = 0;
    for (const relationship of this.topicRelationships) {
      const prereqIndex = chromosome.findIndex(t => t.id === relationship.prerequisite);
      const dependentIndex = chromosome.findIndex(t => t.id === relationship.dependent);
      
      if (prereqIndex > dependentIndex) { // Prerequisite comes after dependent
        relationshipPenalty += relationship.strength;
      }
    }
    
    // Calculate weighted final fitness
    fitness = (
      (learningPatternScore * this.learningPatternWeight) +
      (difficultyScore * this.difficultyProgressionWeight) +
      (timeManagementScore * this.timeManagementWeight) +
      (retentionScore * this.retentionWeight)
    ) * (1 - Math.min(1, relationshipPenalty));

    return fitness;
  }

  private initializePopulation(topics: RoadmapTopic[], performances: TopicPerformance[]): Population[] {
    this.analyzeTopicRelationships(topics, performances);
    const population: Population[] = [];
    
    // Keep original order as one of the initial solutions
    population.push({
      chromosome: [...topics],
      fitness: this.calculateFitness(topics, performances)
    });
    
    // Generate rest of population with variations
    for (let i = 1; i < this.populationSize; i++) {
      const shuffledTopics = [...topics].sort(() => Math.random() - 0.5);
      population.push({
        chromosome: shuffledTopics,
        fitness: this.calculateFitness(shuffledTopics, performances)
      });
    }
    
    return population;
  }

  private selectParent(population: Population[]): RoadmapTopic[] {
    const tournamentSize = Math.max(5, Math.floor(this.populationSize * 0.1));
    const tournament = Array.from({ length: tournamentSize }, () => 
      population[Math.floor(Math.random() * population.length)]
    );
    
    return tournament.reduce((best, current) => 
      current.fitness > best.fitness ? current : best
    ).chromosome;
  }

  private crossover(parent1: RoadmapTopic[], parent2: RoadmapTopic[]): RoadmapTopic[] {
    if (Math.random() > this.crossoverRate) {
      return [...parent1];
    }

    // Use order crossover (OX) to preserve topic ordering
    const start = Math.floor(Math.random() * parent1.length);
    const end = start + Math.floor(Math.random() * (parent1.length - start));
    
    const offspring = new Array(parent1.length).fill(null);
    const segment = parent1.slice(start, end);
    
    // Copy segment from parent1
    for (let i = start; i < end; i++) {
      offspring[i] = parent1[i];
    }
    
    // Fill remaining positions with topics from parent2 in order
    let j = 0;
    for (const topic of parent2) {
      if (!segment.find(t => t.id === topic.id)) {
        while (offspring[j] !== null) j++;
        if (j < parent1.length) {
          offspring[j] = topic;
        }
      }
    }

    return offspring;
  }

  private mutate(chromosome: RoadmapTopic[]): RoadmapTopic[] {
    if (Math.random() > this.mutationRate) {
      return chromosome;
    }

    const mutatedChromosome = [...chromosome];
    
    // Multiple mutation types
    const mutationType = Math.random();
    
    if (mutationType < 0.33) {
      // Swap mutation
      const idx1 = Math.floor(Math.random() * chromosome.length);
      const idx2 = Math.floor(Math.random() * chromosome.length);
      [mutatedChromosome[idx1], mutatedChromosome[idx2]] = 
      [mutatedChromosome[idx2], mutatedChromosome[idx1]];
    } else if (mutationType < 0.66) {
      // Insertion mutation
      const from = Math.floor(Math.random() * chromosome.length);
      const to = Math.floor(Math.random() * chromosome.length);
      const [topic] = mutatedChromosome.splice(from, 1);
      mutatedChromosome.splice(to, 0, topic);
    } else {
      // Reverse mutation
      const start = Math.floor(Math.random() * chromosome.length);
      const length = Math.floor(Math.random() * (chromosome.length - start));
      const segment = mutatedChromosome.splice(start, length);
      segment.reverse();
      mutatedChromosome.splice(start, 0, ...segment);
    }
    
    return mutatedChromosome;
  }

  public optimizeRoadmap(
    topics: RoadmapTopic[],
    performances: TopicPerformance[]
  ): RoadmapTopic[] {
    let population = this.initializePopulation(topics, performances);
    let bestFitness = -Infinity;
    let generationsWithoutImprovement = 0;
    
    for (let generation = 0; generation < this.maxGenerations; generation++) {
      // Sort population by fitness
      population.sort((a, b) => b.fitness - a.fitness);
      
      // Update best fitness
      if (population[0].fitness > bestFitness) {
        bestFitness = population[0].fitness;
        generationsWithoutImprovement = 0;
      } else {
        generationsWithoutImprovement++;
      }
      
      // Early stopping if no improvement for 15 generations
      if (generationsWithoutImprovement > 15) {
        break;
      }
      
      // Keep elite individuals
      const newPopulation = population.slice(0, this.elitismCount);
      
      // Generate new individuals
      while (newPopulation.length < this.populationSize) {
        const parent1 = this.selectParent(population);
        const parent2 = this.selectParent(population);
        
        let offspring = this.crossover(parent1, parent2);
        offspring = this.mutate(offspring);
        
        newPopulation.push({
          chromosome: offspring,
          fitness: this.calculateFitness(offspring, performances)
        });
      }
      
      population = newPopulation;
    }
    
    // Return the best solution
    return population[0].chromosome;
  }
}

export const evolutionService = new EvolutionaryOptimizer(); 