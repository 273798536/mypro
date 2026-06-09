import { create } from 'zustand';
import type {
  Question,
  ScheduleResult,
  DataGap,
  ErrorToleranceConfig,
} from '@/types';
import { DEFAULT_ERROR_TOLERANCE } from '@/types';
import { mockQuestions } from '@/utils/mockData';
import { calculateSchedule, type CalculationResult } from '@/utils/calculator';
import { validateQuestions } from '@/utils/validator';

interface AppState {
  questions: Question[];
  schedules: ScheduleResult[];
  gaps: DataGap[];
  baselineSchedules: ScheduleResult[] | null;
  config: ErrorToleranceConfig;
  stats: {
    total: number;
    processed: number;
    skipped: number;
  };
  lastCalculatedAt: string | null;
  setQuestions: (qs: Question[]) => void;
  updateQuestion: (id: string, patch: Partial<Question>) => void;
  addQuestion: (q: Question) => void;
  removeQuestion: (id: string) => void;
  updateConfig: (patch: Partial<ErrorToleranceConfig>) => void;
  resetConfig: () => void;
  runCalculation: () => CalculationResult;
  captureBaseline: () => void;
  clearBaseline: () => void;
  resetAll: () => void;
  loadMockData: () => void;
  exportJSON: () => string;
  importJSON: (text: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  questions: [],
  schedules: [],
  gaps: [],
  baselineSchedules: null,
  config: { ...DEFAULT_ERROR_TOLERANCE },
  stats: { total: 0, processed: 0, skipped: 0 },
  lastCalculatedAt: null,

  setQuestions: (qs) => {
    validateQuestions(qs);
    set({ questions: qs, schedules: [], gaps: [], baselineSchedules: null });
  },

  updateQuestion: (id, patch) => {
    const questions = get().questions.map((q) =>
      q.id === id ? { ...q, ...patch } : q,
    );
    set({ questions });
  },

  addQuestion: (q) => {
    set({ questions: [...get().questions, q] });
  },

  removeQuestion: (id) => {
    set({ questions: get().questions.filter((q) => q.id !== id) });
  },

  updateConfig: (patch) => {
    set({ config: { ...get().config, ...patch } });
  },

  resetConfig: () => {
    set({ config: { ...DEFAULT_ERROR_TOLERANCE } });
  },

  runCalculation: () => {
    const result = calculateSchedule(get().questions, get().config);
    set({
      schedules: result.schedules,
      gaps: result.gaps,
      stats: {
        total: result.totalQuestions,
        processed: result.processedCount,
        skipped: result.skippedCount,
      },
      lastCalculatedAt: new Date().toISOString(),
    });
    return result;
  },

  captureBaseline: () => {
    if (get().schedules.length === 0) {
      get().runCalculation();
    }
    set({ baselineSchedules: JSON.parse(JSON.stringify(get().schedules)) });
  },

  clearBaseline: () => set({ baselineSchedules: null }),

  resetAll: () => {
    set({
      questions: [],
      schedules: [],
      gaps: [],
      baselineSchedules: null,
      config: { ...DEFAULT_ERROR_TOLERANCE },
      stats: { total: 0, processed: 0, skipped: 0 },
      lastCalculatedAt: null,
    });
  },

  loadMockData: () => {
    set({ questions: JSON.parse(JSON.stringify(mockQuestions)) });
    setTimeout(() => get().runCalculation(), 0);
  },

  exportJSON: () => {
    const { questions, config } = get();
    return JSON.stringify({ questions, config }, null, 2);
  },

  importJSON: (text) => {
    try {
      const data = JSON.parse(text);
      if (data.questions) set({ questions: data.questions });
      if (data.config) set({ config: { ...DEFAULT_ERROR_TOLERANCE, ...data.config } });
    } catch (e) {
      console.error('导入失败:', e);
    }
  },
}));
