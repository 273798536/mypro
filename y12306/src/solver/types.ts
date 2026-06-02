import { Dish, Nutrition, Conflict, TraceLog } from '../types';

export interface SolverInput {
  dishes: Dish[];
  budget: number;
  portionCount: number;
  categoryLimits: {
    category: string;
    min?: number;
    max?: number;
  }[];
  nutritionTargets: {
    nutrient: keyof Nutrition;
    min?: number;
    max?: number;
    weight: number;
  }[];
  excludedAllergens: string[];
  priorityRules: {
    type: 'budget' | 'allergy' | 'nutrition' | 'category';
    priority: number;
    description: string;
  }[];
  configName?: string;
}

export interface SolverDish {
  dish: Dish;
  variableIndex: number;
}

export interface LPSolution {
  variables: number[];
  objectiveValue: number;
  isFeasible: boolean;
}

export interface IPSolution {
  variables: number[];
  objectiveValue: number;
  isOptimal: boolean;
  conflicts: Conflict[];
  traceLogs: TraceLog[];
}

export interface BranchNode {
  id: string;
  lowerBound: number;
  upperBound: number;
  variables: number[];
  depth: number;
  parentId?: string;
  branchConstraint?: {
    variableIndex: number;
    value: number;
  };
}

export interface SolverProgress {
  currentStep: string;
  progress: number;
  nodesExplored: number;
  bestSolutionFound: boolean;
  currentBestValue?: number;
}

export type SolverCallback = (progress: SolverProgress) => void;
