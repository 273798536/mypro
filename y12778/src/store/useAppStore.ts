import { create } from 'zustand';
import type {
  Calculation,
  Reagent,
  BatchInfo,
  TraceLink,
  OperationalError,
} from '../../shared/types';
import { api, type CalculationStats } from '../lib/api';

interface AppState {
  calculations: Calculation[];
  calculationStats: CalculationStats | null;
  currentCalculation: (Calculation & { traceIds: TraceLink[] }) | null;
  reagents: Reagent[];
  batches: BatchInfo[];
  currentBatch: BatchInfo | null;
  loading: boolean;
  error: OperationalError | null;

  fetchCalculations: (status?: string) => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchCalculationDetail: (id: string) => Promise<void>;
  createCalculation: (data: {
    reagentId: string;
    observedTension: number;
    temperature: number;
  }) => Promise<{ success: boolean; data?: Calculation; error?: OperationalError }>;
  reviewCalculation: (
    id: string,
    status: 'passed' | 'rejected',
    reviewNote?: string
  ) => Promise<void>;
  exportCalculation: (id: string) => Promise<void>;

  fetchReagents: () => Promise<void>;
  supplementReagent: (
    id: string,
    data: { fieldName: string; newValue: string; reason: string }
  ) => Promise<{ success: boolean; data?: Reagent; error?: OperationalError }>;

  fetchBatches: () => Promise<void>;
  fetchBatchDetail: (batchNo: string) => Promise<void>;

  clearError: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  calculations: [],
  calculationStats: null,
  currentCalculation: null,
  reagents: [],
  batches: [],
  currentBatch: null,
  loading: false,
  error: null,

  fetchCalculations: async (status) => {
    set({ loading: true });
    try {
      const data = await api.getCalculations(status);
      set({ calculations: data, loading: false });
    } catch (e) {
      set({ loading: false });
    }
  },

  fetchStats: async () => {
    try {
      const data = await api.getCalculationStats();
      set({ calculationStats: data });
    } catch (e) {
      // ignore
    }
  },

  fetchCalculationDetail: async (id) => {
    set({ loading: true, currentCalculation: null });
    try {
      const data = await api.getCalculation(id);
      set({ currentCalculation: data, loading: false });
    } catch (e) {
      set({ loading: false });
    }
  },

  createCalculation: async (data) => {
    set({ error: null });
    try {
      const result = await api.createCalculation(data);
      await get().fetchCalculations();
      await get().fetchStats();
      return { success: true, data: result };
    } catch (e) {
      const err = e as { error?: OperationalError };
      set({ error: err.error ?? null });
      return { success: false, error: err.error };
    }
  },

  reviewCalculation: async (id, status, reviewNote) => {
    try {
      await api.reviewCalculation(id, {
        status,
        reviewNote,
        operator: '质检工程师',
      });
      await get().fetchCalculations();
      await get().fetchStats();
      await get().fetchCalculationDetail(id);
    } catch (e) {
      // ignore
    }
  },

  exportCalculation: async (id) => {
    await api.exportCalculation(id);
  },

  fetchReagents: async () => {
    set({ loading: true });
    try {
      const data = await api.getReagents();
      set({ reagents: data, loading: false });
    } catch (e) {
      set({ loading: false });
    }
  },

  supplementReagent: async (id, data) => {
    set({ error: null });
    try {
      const result = await api.supplementReagent(id, {
        ...data,
        operator: '质检工程师',
      });
      await get().fetchReagents();
      return { success: true, data: result };
    } catch (e) {
      const err = e as { error?: OperationalError };
      set({ error: err.error ?? null });
      return { success: false, error: err.error };
    }
  },

  fetchBatches: async () => {
    set({ loading: true });
    try {
      const data = await api.getBatches();
      set({ batches: data, loading: false });
    } catch (e) {
      set({ loading: false });
    }
  },

  fetchBatchDetail: async (batchNo) => {
    set({ loading: true, currentBatch: null });
    try {
      const data = await api.getBatch(batchNo);
      set({ currentBatch: data, loading: false });
    } catch (e) {
      set({ loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
