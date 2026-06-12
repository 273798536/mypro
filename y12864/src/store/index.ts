import { create } from 'zustand';
import type { SamplingRecord, ExportReport, AnomalyGroup, ImpactChainResult } from '../../shared/types';
import { api } from '../utils/api';

interface AppState {
  records: SamplingRecord[];
  loading: boolean;
  error: string | null;
  anomalyGroup: AnomalyGroup | null;
  exportPreview: ExportReport | null;
  impactChain: ImpactChainResult | null;

  fetchRecords: () => Promise<void>;
  fetchAnomalies: () => Promise<void>;
  fetchExportPreview: () => Promise<void>;
  fetchImpactChain: (id: number) => Promise<void>;

  createRecord: (input: Parameters<typeof api.records.create>[0]) => Promise<void>;
  updateRecord: (id: number, updates: Parameters<typeof api.records.update>[1]) => Promise<void>;
  deleteRecord: (id: number) => Promise<void>;
  batchImport: (records: Parameters<typeof api.records.batchImport>[0]) => Promise<{ imported: number; failed: number }>;
  clearImpactChain: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  records: [],
  loading: false,
  error: null,
  anomalyGroup: null,
  exportPreview: null,
  impactChain: null,

  fetchRecords: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.records.getAll();
      set({ records: res.data, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchAnomalies: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.anomalies.getAll();
      set({ anomalyGroup: res.data, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchExportPreview: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.export.preview();
      set({ exportPreview: res.data, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchImpactChain: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const res = await api.anomalies.getImpactChain(id);
      set({ impactChain: res.data, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  createRecord: async (input) => {
    set({ loading: true, error: null });
    try {
      await api.records.create(input);
      await get().fetchRecords();
      set({ loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
      throw e;
    }
  },

  updateRecord: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      await api.records.update(id, updates);
      await get().fetchRecords();
      if (get().anomalyGroup) {
        await get().fetchAnomalies();
      }
      if (get().exportPreview) {
        await get().fetchExportPreview();
      }
      set({ loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
      throw e;
    }
  },

  deleteRecord: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.records.remove(id);
      await get().fetchRecords();
      set({ loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
      throw e;
    }
  },

  batchImport: async (records) => {
    set({ loading: true, error: null });
    try {
      const res = await api.records.batchImport(records);
      await get().fetchRecords();
      set({ loading: false });
      return { imported: res.imported, failed: res.failed };
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
      throw e;
    }
  },

  clearImpactChain: () => set({ impactChain: null })
}));
