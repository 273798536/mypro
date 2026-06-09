import { create } from 'zustand';
import type {
  BatchReview,
  DifficultyParams,
  Problem,
  ScoreRecord,
  HistoricalAnswer,
  EmptySetStrategy,
} from '@/types';
import { buildInitialBatch, recomputeBatch, uid } from '@/utils/difficultyEngine';

interface BatchState {
  batch: BatchReview;
  selectedProblemId: string | null;
  setSelectedProblemId: (id: string | null) => void;
  updateParams: (patch: Partial<DifficultyParams>) => void;
  addProblem: (p: Omit<Problem, 'id' | 'isDuplicate'>) => void;
  updateProblem: (id: string, patch: Partial<Problem>) => void;
  removeProblem: (id: string) => void;
  addScore: (s: Omit<ScoreRecord, 'id'>) => void;
  removeScore: (id: string) => void;
  markChartAvailable: (name: string) => void;
  markChartMissing: (name: string) => void;
  addHistoricalAnswer: (answer: Omit<HistoricalAnswer, 'id' | 'recordedAt'>) => void;
  setEmptySetStrategy: (strategy: EmptySetStrategy, defaultValue?: number) => void;
  resolveAnomaly: (id: string) => void;
  recompute: () => void;
}

export const useBatchStore = create<BatchState>((set, get) => ({
  batch: buildInitialBatch('BATCH-2025-0610-01'),
  selectedProblemId: null,

  setSelectedProblemId: (id) => set({ selectedProblemId: id }),

  updateParams: (patch) => {
    set((s) => {
      const batch = recomputeBatch({ ...s.batch, params: { ...s.batch.params, ...patch } });
      return { batch };
    });
  },

  addProblem: (p) => {
    set((s) => {
      const problem: Problem = { ...p, id: uid(), isDuplicate: false };
      const batch = recomputeBatch({ ...s.batch, problems: [...s.batch.problems, problem] });
      return { batch };
    });
  },

  updateProblem: (id, patch) => {
    set((s) => {
      const problems = s.batch.problems.map((p) => (p.id === id ? { ...p, ...patch } : p));
      const batch = recomputeBatch({ ...s.batch, problems });
      return { batch };
    });
  },

  removeProblem: (id) => {
    set((s) => {
      const problems = s.batch.problems.filter((p) => p.id !== id);
      const scores = s.batch.scores.filter((sc) => sc.problemId !== id);
      const batch = recomputeBatch({ ...s.batch, problems, scores });
      return { batch, selectedProblemId: s.selectedProblemId === id ? null : s.selectedProblemId };
    });
  },

  addScore: (s) => {
    set((st) => {
      const score: ScoreRecord = { ...s, id: uid() };
      const batch = recomputeBatch({ ...st.batch, scores: [...st.batch.scores, score] });
      return { batch };
    });
  },

  removeScore: (id) => {
    set((s) => {
      const scores = s.batch.scores.filter((sc) => sc.id !== id);
      const batch = recomputeBatch({ ...s.batch, scores });
      return { batch };
    });
  },

  markChartAvailable: (name) => {
    set((s) => {
      if (!s.batch.chartsMissing.includes(name)) return {};
      const chartsMissing = s.batch.chartsMissing.filter((n) => n !== name);
      const chartsAvailable = s.batch.chartsAvailable.includes(name)
        ? s.batch.chartsAvailable
        : [...s.batch.chartsAvailable, name];
      const batch = recomputeBatch({ ...s.batch, chartsMissing, chartsAvailable });
      return { batch };
    });
  },

  markChartMissing: (name) => {
    set((s) => {
      if (!s.batch.chartsAvailable.includes(name)) return {};
      const chartsAvailable = s.batch.chartsAvailable.filter((n) => n !== name);
      const chartsMissing = s.batch.chartsMissing.includes(name)
        ? s.batch.chartsMissing
        : [...s.batch.chartsMissing, name];
      const batch = recomputeBatch({ ...s.batch, chartsMissing, chartsAvailable });
      return { batch };
    });
  },

  addHistoricalAnswer: (answer) => {
    set((s) => {
      const ha: HistoricalAnswer = { ...answer, id: uid(), recordedAt: new Date().toISOString() };
      const batch = recomputeBatch({
        ...s.batch,
        historicalAnswers: [...s.batch.historicalAnswers, ha],
      });
      return { batch };
    });
  },

  setEmptySetStrategy: (strategy, defaultValue) => {
    set((s) => {
      const batch = recomputeBatch({
        ...s.batch,
        params: { ...s.batch.params, emptySetStrategy: strategy, emptySetDefaultValue: defaultValue },
      });
      return { batch };
    });
  },

  resolveAnomaly: (id) => {
    set((s) => {
      const anomalies = s.batch.anomalies.map((a) => (a.id === id ? { ...a, resolved: true } : a));
      return { batch: { ...s.batch, anomalies } };
    });
  },

  recompute: () => {
    set((s) => ({ batch: recomputeBatch(s.batch) }));
  },
}));
