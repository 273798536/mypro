import { create } from 'zustand';
import type { LoadingRecord, RecordStatus, AnomalyType, ImportResult } from '../../shared/types';
import { recordApi } from '../api/client';

interface AppState {
  records: LoadingRecord[];
  anomalies: LoadingRecord[];
  stats: Record<RecordStatus, number>;
  filters: {
    status?: RecordStatus;
    anomalyType?: AnomalyType;
    search: string;
  };
  loading: boolean;
  importResult: ImportResult | null;
  error: string | null;

  setFilters: (filters: Partial<AppState['filters']>) => void;
  fetchRecords: () => Promise<void>;
  fetchAnomalies: () => Promise<void>;
  fetchStats: () => Promise<void>;
  importFile: (file: File) => Promise<void>;
  importSample: () => Promise<void>;
  clearImportResult: () => void;
  clearError: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  records: [],
  anomalies: [],
  stats: { pending: 0, approved: 0, rejected: 0, anomaly: 0 },
  filters: { search: '' },
  loading: false,
  importResult: null,
  error: null,

  setFilters: (filters) => {
    set((state) => ({ filters: { ...state.filters, ...filters } }));
    get().fetchRecords();
  },

  fetchRecords: async () => {
    set({ loading: true });
    try {
      const { filters } = get();
      const records = await recordApi.getRecords(filters);
      set({ records, error: null });
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  fetchAnomalies: async () => {
    set({ loading: true });
    try {
      const anomalies = await recordApi.getAnomalies();
      set({ anomalies, error: null });
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  fetchStats: async () => {
    try {
      const stats = await recordApi.getStats();
      set({ stats });
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    }
  },

  importFile: async (file: File) => {
    set({ loading: true });
    try {
      const result = await recordApi.importFile(file);
      set({ importResult: result, error: null });
      await get().fetchRecords();
      await get().fetchStats();
      await get().fetchAnomalies();
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  importSample: async () => {
    set({ loading: true });
    try {
      const result = await recordApi.importSample();
      set({ importResult: result, error: null });
      await get().fetchRecords();
      await get().fetchStats();
      await get().fetchAnomalies();
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  clearImportResult: () => set({ importResult: null }),
  clearError: () => set({ error: null }),
}));
