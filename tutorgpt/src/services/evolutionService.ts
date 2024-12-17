import { RoadmapTopic } from '../types/roadmap.ts';

interface LearningMetrics {
  completionTime: number;
  attemptsCount: number;
  successRate: number;
  difficultyRating: number;
}

interface TopicPerformance {
  topicId: string;
  metrics: LearningMetrics;
}

interface Population {
  chromosome: RoadmapTopic[];
  fitness: number;
}

export class EvolutionaryOptimizer {
  private populationSize: number;
  private mutationRate: number;
  private crossoverRate: number;
  private elitismCount: number;
  private maxGenerations: number;

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
  }

  // Calculate fitness based on user performance and topic dependencies
  private calculateFitness(chromosome: RoadmapTopic[], performances: TopicPerformance[]): number {
    let fitness = 0;
    
    for (let i = 0; i < chromosome.length; i++) {
      const topic = chromosome[i];
      const performance = performances.find(p => p.topicId === topic.id);
      
      if (performance) {
        // Higher fitness for topics with better success rates
        fitness += performance.metrics.successRate * 0.4;
        
        // Lower fitness for topics that take too long or require many attempts
        fitness -= (performance.metrics.completionTime / 3600000) * 0.2; // Convert ms to hours
        fitness -= (performance.metrics.attemptsCount / 10) * 0.2;
        
        // Consider topic dependencies
        if (i > 0) {
          const prevTopic = chromosome[i - 1];
          const prevPerformance = performances.find(p => p.topicId === prevTopic.id);
          
          if (prevPerformance) {
            // Penalize if prerequisite topics have low success rates
            if (prevPerformance.metrics.successRate < 0.7) {
              fitness -= 0.3;
            }
          }
        }
      }
    }
    
    return fitness;
  }

  // Create initial population
  private initializePopulation(topics: RoadmapTopic[], performances: TopicPerformance[]): Population[] {
    const population: Population[] = [];
    
    for (let i = 0; i < this.populationSize; i++) {
      const shuffledTopics = [...topics].sort(() => Math.random() - 0.5);
      population.push({
        chromosome: shuffledTopics,
        fitness: this.calculateFitness(shuffledTopics, performances)
      });
    }
    
    return population;
  }

  // Select parents using tournament selection
  private selectParent(population: Population[]): RoadmapTopic[] {
    const tournamentSize = 5;
    const tournament = Array.from({ length: tournamentSize }, () => 
      population[Math.floor(Math.random() * population.length)]
    );
    
    return tournament.reduce((best, current) => 
      current.fitness > best.fitness ? current : best
    ).chromosome;
  }

  // Perform crossover between parents
  private crossover(parent1: RoadmapTopic[], parent2: RoadmapTopic[]): RoadmapTopic[] {
    if (Math.random() > this.crossoverRate) {
      return [...parent1];
    }

    const crossoverPoint = Math.floor(Math.random() * parent1.length);
    const offspring = parent1.slice(0, crossoverPoint);
    
    // Add remaining topics from parent2 while preserving order and avoiding duplicates
    parent2.forEach(topic => {
      if (!offspring.find(t => t.id === topic.id)) {
        offspring.push(topic);
      }
    });

    return offspring;
  }

  // Perform mutation on chromosome
  private mutate(chromosome: RoadmapTopic[]): RoadmapTopic[] {
    if (Math.random() > this.mutationRate) {
      return chromosome;
    }

    const mutatedChromosome = [...chromosome];
    const idx1 = Math.floor(Math.random() * chromosome.length);
    const idx2 = Math.floor(Math.random() * chromosome.length);
    
    [mutatedChromosome[idx1], mutatedChromosome[idx2]] = 
    [mutatedChromosome[idx2], mutatedChromosome[idx1]];
    
    return mutatedChromosome;
  }

  // Main optimization function
  public optimizeRoadmap(
    topics: RoadmapTopic[],
    performances: TopicPerformance[]
  ): RoadmapTopic[] {
    let population = this.initializePopulation(topics, performances);
    
    for (let generation = 0; generation < this.maxGenerations; generation++) {
      // Sort population by fitness
      population.sort((a, b) => b.fitness - a.fitness);
      
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
      
      // Early stopping if fitness improvement is minimal
      if (generation > 10) {
        const bestFitness = population[0].fitness;
        const worstEliteFitness = population[this.elitismCount - 1].fitness;
        if (bestFitness - worstEliteFitness < 0.01) {
          break;
        }
      }
    }
    
    // Return the best solution
    return population[0].chromosome;
  }
}

export const evolutionService = new EvolutionaryOptimizer(); 