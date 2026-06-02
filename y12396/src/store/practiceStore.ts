import { create } from 'zustand';
import {
  apiClient,
  type PracticeRecord,
  type PracticeDetail,
  type PracticeReport,
} from '@/lib/api';

interface PracticeStore {
  practices: PracticeRecord[];
  total: number;
  currentPractice: PracticeDetail | null;
  loading: boolean;
  error: string | null;
  filters: { studentName: string; dateFrom: string; dateTo: string; status: string };
  page: number;
  pageSize: number;
  fetchPractices: () => Promise<void>;
  fetchPracticeDetail: (id: string) => Promise<void>;
  setFilters: (filters: Partial<PracticeStore['filters']>) => void;
  setPage: (page: number) => void;
  flagConflict: (practiceId: string, conflictId: string) => Promise<void>;
  resolveConflict: (practiceId: string, conflictId: string, resolvedBy: string) => Promise<void>;
  createCorrection: (practiceId: string, data: { field: string; oldValue: string; newValue: string; reason: string; operator: string }) => Promise<void>;
  generateReport: (practiceId: string) => Promise<PracticeReport>;
  clearError: () => void;
}

export const usePracticeStore = create<PracticeStore>((set, get) => ({
  practices: [],
  total: 0,
  currentPractice: null,
  loading: false,
  error: null,
  filters: { studentName: '', dateFrom: '', dateTo: '', status: '' },
  page: 1,
  pageSize: 12,

  fetchPractices: async () => {
    set({ loading: true, error: null });
    try {
      const { filters, page, pageSize } = get();
      const result = await apiClient.listPractices({
        ...filters,
        page,
        pageSize,
      });
      set({ practices: result.data, total: result.total, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchPracticeDetail: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const detail = await apiClient.getPracticeDetail(id);
      set({ currentPractice: detail, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  setFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters }, page: 1 });
  },

  setPage: (page) => {
    set({ page });
  },

  flagConflict: async (practiceId, conflictId) => {
    set({ loading: true, error: null });
    try {
      await apiClient.flagConflict(practiceId, conflictId);
      const detail = await apiClient.getPracticeDetail(practiceId);
      set({ currentPractice: detail, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  resolveConflict: async (practiceId, conflictId, resolvedBy) => {
    set({ loading: true, error: null });
    try {
      await apiClient.resolveConflict(practiceId, conflictId, { resolvedBy });
      const detail = await apiClient.getPracticeDetail(practiceId);
      set({ currentPractice: detail, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  createCorrection: async (practiceId, data) => {
    set({ loading: true, error: null });
    try {
      await apiClient.createCorrection(practiceId, data);
      const detail = await apiClient.getPracticeDetail(practiceId);
      set({ currentPractice: detail, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  generateReport: async (practiceId) => {
    set({ loading: true, error: null });
    try {
      const report = await apiClient.generateReport(practiceId);
      set({ loading: false });
      return report;
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
      throw e;
    }
  },

  clearError: () => set({ error: null }),
}));
