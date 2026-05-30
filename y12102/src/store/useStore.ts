import { create } from 'zustand';
import {
  Judge,
  Supplier,
  ScoreCategory,
  Score,
  ReviewLog,
  CalculationResult,
  ConsistencyResult,
  SensitivityResult,
  AppState,
} from '../types';
import {
  sampleJudges,
  sampleSuppliers,
  sampleCategories,
  sampleScoresNormal,
  sampleScoresWithExtremeJudge,
  sampleScoresWithMissing,
  sampleCategoriesUnnormalized,
  sampleReviewLogs,
} from '../data/sampleData';
import {
  calculateWeightedScores,
  checkConsistency,
  calculateSensitivity,
} from '../utils/calculationEngine';

interface StoreState extends AppState {
  setJudges: (judges: Judge[]) => void;
  setSuppliers: (suppliers: Supplier[]) => void;
  setCategories: (categories: ScoreCategory[]) => void;
  setScores: (scores: Score[]) => void;
  setReviewLogs: (logs: ReviewLog[]) => void;
  setActiveTab: (tab: AppState['activeTab']) => void;
  setExpandedResult: (id: string | null) => void;
  loadSampleData: (type: 'normal' | 'extreme' | 'missing' | 'unnormalized') => void;
  runCalculation: () => void;
  updateScore: (judgeId: string, supplierId: string, categoryId: string, value: number | null) => void;
  updateCategoryWeight: (categoryId: string, weight: number) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  judges: sampleJudges,
  suppliers: sampleSuppliers,
  categories: sampleCategories,
  scores: sampleScoresNormal,
  reviewLogs: sampleReviewLogs,
  calculationResults: [],
  consistencyResults: null,
  sensitivityResults: null,
  activeTab: 'scores',
  expandedResult: null,

  setJudges: (judges) => set({ judges }),
  setSuppliers: (suppliers) => set({ suppliers }),
  setCategories: (categories) => set({ categories }),
  setScores: (scores) => set({ scores }),
  setReviewLogs: (reviewLogs) => set({ reviewLogs }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setExpandedResult: (expandedResult) => set({ expandedResult }),

  loadSampleData: (type) => {
    switch (type) {
      case 'extreme':
        set({ scores: sampleScoresWithExtremeJudge, categories: sampleCategories });
        break;
      case 'missing':
        set({ scores: sampleScoresWithMissing, categories: sampleCategories });
        break;
      case 'unnormalized':
        set({ scores: sampleScoresNormal, categories: sampleCategoriesUnnormalized });
        break;
      default:
        set({ scores: sampleScoresNormal, categories: sampleCategories });
    }
  },

  runCalculation: () => {
    const { judges, suppliers, categories, scores } = get();
    const { results } = calculateWeightedScores(judges, suppliers, categories, scores);
    const consistency = checkConsistency(judges, suppliers, categories, scores);
    const sensitivity = calculateSensitivity(judges, suppliers, categories, scores, results);

    set({
      calculationResults: results,
      consistencyResults: consistency,
      sensitivityResults: sensitivity,
    });
  },

  updateScore: (judgeId, supplierId, categoryId, value) => {
    set((state) => ({
      scores: state.scores.map((s) =>
        s.judgeId === judgeId && s.supplierId === supplierId && s.categoryId === categoryId
          ? { ...s, value, timestamp: new Date().toLocaleString() }
          : s
      ),
    }));
  },

  updateCategoryWeight: (categoryId, weight) => {
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === categoryId ? { ...c, weight } : c
      ),
    }));
  },
}));
