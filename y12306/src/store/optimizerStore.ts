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
  isLoaded: boolean;

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

  loadHistory: () => void;
  runOptimization: () => Promise<void>;
  setCurrentResult: (result: OptimizationResult | null) => void;
  clearHistory: () => void;
}

const STORAGE_KEY = 'optimizer-history';

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

function deserializeResult(data: unknown): OptimizationResult | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  if (
    typeof obj.id !== 'string' ||
    typeof obj.configId !== 'string' ||
    typeof obj.configName !== 'string' ||
    !Array.isArray(obj.selectedDishes) ||
    typeof obj.totalCost !== 'number' ||
    typeof obj.totalNutrition !== 'object' ||
    !Array.isArray(obj.conflicts) ||
    !Array.isArray(obj.traceLogs) ||
    typeof obj.score !== 'number' ||
    typeof obj.status !== 'string'
  ) {
    return null;
  }
  return {
    id: obj.id,
    configId: obj.configId,
    configName: obj.configName,
    selectedDishes: obj.selectedDishes,
    totalCost: obj.totalCost,
    totalNutrition: obj.totalNutrition as OptimizationResult['totalNutrition'],
    conflicts: obj.conflicts,
    traceLogs: obj.traceLogs,
    alternativePlans: Array.isArray(obj.alternativePlans) ? obj.alternativePlans : [],
    score: obj.score,
    status: obj.status as OptimizationResult['status'],
    createdAt: obj.createdAt ? new Date(obj.createdAt as string) : new Date(),
  };
}

function loadHistoryFromStorage(): OptimizationResult[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(deserializeResult)
      .filter((r): r is OptimizationResult => r !== null)
      .slice(0, 10);
  } catch {
    return [];
  }
}

function saveHistoryToStorage(history: OptimizationResult[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    console.error('Failed to save history to localStorage');
  }
}

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
  isLoaded: false,

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

  loadHistory: () => {
    const history = loadHistoryFromStorage();
    const currentResult = history.length > 0 ? history[0] : null;
    set({ history, currentResult, isLoaded: true });
  },

  runOptimization: async () => {
    const { config } = get();
    const dishes = useDishStore.getState().dishes;

    if (dishes.length === 0) {
      set({
        solverState: {
          isRunning: false,
          progress: 0,
          currentStep: '',
          logs: ['菜品库为空，请先导入或添加菜品'],
        },
      });
      return;
    }

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

    const newHistory = [finalResult, ...get().history].slice(0, 10);
    saveHistoryToStorage(newHistory);

    set({
      currentResult: finalResult,
      history: newHistory,
      solverState: {
        isRunning: false,
        progress: 100,
        currentStep: '完成',
        logs: [...get().solverState.logs, '求解完成！'],
      },
    });
  },

  setCurrentResult: (result) => set({ currentResult: result }),

  clearHistory: () => {
    saveHistoryToStorage([]);
    set({ history: [], currentResult: null });
  },
}));
