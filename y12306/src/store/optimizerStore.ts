import { create } from 'zustand';
import {
  OptimizationConfig,
  OptimizationResult,
  NutritionTarget,
  CategoryLimit,
  PriorityRule,
  SolverState,
} from '../types';
import { solveIntegerProgramming, SolverProgress } from '../solver';
import { useDishStore } from './dishStore';

interface OptimizerStore {
  config: OptimizationConfig;
  currentResult: OptimizationResult | null;
  history: OptimizationResult[];
  solverState: SolverState;

  setConfigName: (name: string) => void;
  setBudget: (budget: number) => void;
  setPortionCount: (count: number) => void;
  addNutritionTarget: (target: NutritionTarget) => void;
  updateNutritionTarget: (index: number, target: NutritionTarget) => void;
  removeNutritionTarget: (index: number) => void;
  addCategoryLimit: (limit: CategoryLimit) => void;
  updateCategoryLimit: (index: number, limit: CategoryLimit) => void;
  removeCategoryLimit: (index: number) => void;
  setExcludedAllergens: (allergens: string[]) => void;
  setPriorityRules: (rules: PriorityRule[]) => void;
  resetConfig: () => void;

  runOptimization: () => Promise<void>;
  setCurrentResult: (result: OptimizationResult | null) => void;
  clearHistory: () => void;
}

const defaultNutritionTargets: NutritionTarget[] = [
  { nutrient: 'calories', min: 800, weight: 1 },
  { nutrient: 'protein', min: 30, weight: 1.2 },
  { nutrient: 'calcium', min: 200, weight: 0.8 },
  { nutrient: 'iron', min: 5, weight: 0.8 },
  { nutrient: 'vitaminC', min: 30, weight: 0.6 },
];

const defaultCategoryLimits: CategoryLimit[] = [
  { category: '主食', min: 1, max: 2 },
  { category: '荤菜', min: 1, max: 2 },
  { category: '素菜', min: 1, max: 2 },
  { category: '汤品', min: 0, max: 1 },
];

const defaultPriorityRules: PriorityRule[] = [
  { type: 'allergy', priority: 1, description: '过敏约束不可违反' },
  { type: 'budget', priority: 2, description: '预算约束优先满足' },
  { type: 'nutrition', priority: 3, description: '营养约束尽量满足' },
  { type: 'category', priority: 4, description: '品类约束灵活调整' },
];

const createDefaultConfig = (): OptimizationConfig => ({
  id: `config-${Date.now()}`,
  name: '默认配餐方案',
  budget: 30,
  portionCount: 5,
  categoryLimits: [...defaultCategoryLimits],
  nutritionTargets: [...defaultNutritionTargets],
  excludedAllergens: [],
  priorityRules: [...defaultPriorityRules],
  createdAt: new Date(),
});

export const useOptimizerStore = create<OptimizerStore>((set, get) => ({
  config: createDefaultConfig(),
  currentResult: null,
  history: [],
  solverState: {
    isRunning: false,
    progress: 0,
    currentStep: '',
    logs: [],
  },

  setConfigName: (name) =>
    set((state) => ({ config: { ...state.config, name } })),

  setBudget: (budget) =>
    set((state) => ({ config: { ...state.config, budget } })),

  setPortionCount: (portionCount) =>
    set((state) => ({ config: { ...state.config, portionCount } })),

  addNutritionTarget: (target) =>
    set((state) => ({
      config: {
        ...state.config,
        nutritionTargets: [...state.config.nutritionTargets, target],
      },
    })),

  updateNutritionTarget: (index, target) =>
    set((state) => {
      const newTargets = [...state.config.nutritionTargets];
      newTargets[index] = target;
      return { config: { ...state.config, nutritionTargets: newTargets } };
    }),

  removeNutritionTarget: (index) =>
    set((state) => ({
      config: {
        ...state.config,
        nutritionTargets: state.config.nutritionTargets.filter((_, i) => i !== index),
      },
    })),

  addCategoryLimit: (limit) =>
    set((state) => ({
      config: {
        ...state.config,
        categoryLimits: [...state.config.categoryLimits, limit],
      },
    })),

  updateCategoryLimit: (index, limit) =>
    set((state) => {
      const newLimits = [...state.config.categoryLimits];
      newLimits[index] = limit;
      return { config: { ...state.config, categoryLimits: newLimits } };
    }),

  removeCategoryLimit: (index) =>
    set((state) => ({
      config: {
        ...state.config,
        categoryLimits: state.config.categoryLimits.filter((_, i) => i !== index),
      },
    })),

  setExcludedAllergens: (excludedAllergens) =>
    set((state) => ({ config: { ...state.config, excludedAllergens } })),

  setPriorityRules: (priorityRules) =>
    set((state) => ({ config: { ...state.config, priorityRules } })),

  resetConfig: () => set({ config: createDefaultConfig() }),

  runOptimization: async () => {
    const { config } = get();
    const dishes = useDishStore.getState().dishes;

    set({
      solverState: {
        isRunning: true,
        progress: 0,
        currentStep: '准备求解...',
        logs: ['开始整数规划求解...'],
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    const result = solveIntegerProgramming(
      {
        dishes,
        budget: config.budget,
        portionCount: config.portionCount,
        categoryLimits: config.categoryLimits,
        nutritionTargets: config.nutritionTargets,
        excludedAllergens: config.excludedAllergens,
        priorityRules: config.priorityRules,
        configName: config.name,
      },
      (progress: SolverProgress) => {
        set((state) => ({
          solverState: {
            ...state.solverState,
            progress: progress.progress,
            currentStep: progress.currentStep,
            logs: [...state.solverState.logs, progress.currentStep],
          },
        }));
      }
    );

    const finalResult: OptimizationResult = {
      ...result,
      id: `result-${Date.now()}`,
      configId: config.id,
      configName: config.name,
    };

    set((state) => ({
      currentResult: finalResult,
      history: [finalResult, ...state.history].slice(0, 10),
      solverState: {
        isRunning: false,
        progress: 100,
        currentStep: '完成',
        logs: [...state.solverState.logs, '求解完成！'],
      },
    }));
  },

  setCurrentResult: (result) => set({ currentResult: result }),

  clearHistory: () => set({ history: [] }),
}));
