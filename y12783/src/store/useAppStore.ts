import { create } from 'zustand';
import { api } from '../api/client';
import type { Reagent, Batch, ThicknessRecord, SpectrumRecord, ImportResult } from '../../shared/types';

interface AppState {
  reagents: Reagent[];
  batches: Batch[];
  spectrums: SpectrumRecord[];
  currentBatchThickness: ThicknessRecord[];
  loading: boolean;
  error: string | null;
  initialized: boolean;

  fetchReagents: (params?: Record<string, string>) => Promise<void>;
  fetchBatches: (params?: Record<string, string>) => Promise<void>;
  fetchSpectrums: (params?: Record<string, string>) => Promise<void>;
  fetchBatchThickness: (batchId: string) => Promise<void>;
  checkInitStatus: () => Promise<boolean>;
  initSampleData: () => Promise<boolean>;
  addReagent: (data: Omit<Reagent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Reagent>;
  updateReagent: (id: string, data: Partial<Reagent>) => Promise<Reagent | null>;
  deleteReagent: (id: string) => Promise<boolean>;
  importReagents: (items: any[]) => Promise<ImportResult>;
  addReagentTransaction: (id: string, data: any) => Promise<any>;
  addBatch: (data: Omit<Batch, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Batch>;
  updateBatch: (id: string, data: Partial<Batch>) => Promise<Batch | null>;
  deleteBatch: (id: string) => Promise<boolean>;
  importBatches: (items: any[]) => Promise<ImportResult>;
  addThicknessRecord: (batchId: string, data: any) => Promise<ThicknessRecord | null>;
  interpretSpectrum: (id: string, data: any) => Promise<SpectrumRecord | null>;
}

export const useAppStore = create<AppState>((set, get) => ({
  reagents: [],
  batches: [],
  spectrums: [],
  currentBatchThickness: [],
  loading: false,
  error: null,
  initialized: false,

  fetchReagents: async (params) => {
    set({ loading: true, error: null });
    try {
      const data = await api.reagents.list(params);
      set({ reagents: data as Reagent[] });
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  fetchBatches: async (params) => {
    set({ loading: true, error: null });
    try {
      const data = await api.batches.list(params);
      set({ batches: data as Batch[] });
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  fetchSpectrums: async (params) => {
    set({ loading: true, error: null });
    try {
      const data = await api.spectrums.list(params);
      set({ spectrums: data as SpectrumRecord[] });
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  fetchBatchThickness: async (batchId) => {
    set({ loading: true, error: null });
    try {
      const data = await api.batches.thicknessList(batchId);
      set({ currentBatchThickness: data as ThicknessRecord[] });
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  checkInitStatus: async () => {
    try {
      const data = await api.sampleData.status();
      set({ initialized: data.initialized });
      return data.initialized;
    } catch {
      return false;
    }
  },

  initSampleData: async () => {
    try {
      const data = await api.sampleData.init();
      if (data.success) {
        set({ initialized: true });
        get().fetchReagents();
        get().fetchBatches();
        get().fetchSpectrums();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  addReagent: async (data) => {
    const reagent = await api.reagents.create(data);
    set((state) => ({ reagents: [...state.reagents, reagent as Reagent] }));
    return reagent as Reagent;
  },

  updateReagent: async (id, data) => {
    try {
      const updated = await api.reagents.update(id, data);
      set((state) => ({
        reagents: state.reagents.map((r) => (r.id === id ? (updated as Reagent) : r)),
      }));
      return updated as Reagent;
    } catch {
      return null;
    }
  },

  deleteReagent: async (id) => {
    try {
      await api.reagents.remove(id);
      set((state) => ({ reagents: state.reagents.filter((r) => r.id !== id) }));
      return true;
    } catch {
      return false;
    }
  },

  importReagents: async (items) => {
    const result = await api.reagents.import(items);
    get().fetchReagents();
    return result as ImportResult;
  },

  addReagentTransaction: async (id, data) => {
    try {
      const result = await api.reagents.addTransaction(id, data);
      get().fetchReagents();
      return result;
    } catch {
      return null;
    }
  },

  addBatch: async (data) => {
    const batch = await api.batches.create(data);
    set((state) => ({ batches: [batch as Batch, ...state.batches] }));
    return batch as Batch;
  },

  updateBatch: async (id, data) => {
    try {
      const updated = await api.batches.update(id, data);
      set((state) => ({
        batches: state.batches.map((b) => (b.id === id ? (updated as Batch) : b)),
      }));
      return updated as Batch;
    } catch {
      return null;
    }
  },

  deleteBatch: async (id) => {
    try {
      await api.batches.remove(id);
      set((state) => ({ batches: state.batches.filter((b) => b.id !== id) }));
      return true;
    } catch {
      return false;
    }
  },

  importBatches: async (items) => {
    const result = await api.batches.import(items);
    get().fetchBatches();
    return result as ImportResult;
  },

  addThicknessRecord: async (batchId, data) => {
    try {
      const record = await api.batches.addThickness(batchId, data);
      set((state) => ({
        currentBatchThickness: [record as ThicknessRecord, ...state.currentBatchThickness],
      }));
      get().fetchBatches();
      return record as ThicknessRecord;
    } catch {
      return null;
    }
  },

  interpretSpectrum: async (id, data) => {
    try {
      const result = await api.spectrums.interpret(id, data);
      set((state) => ({
        spectrums: state.spectrums.map((s) => (s.id === id ? (result as SpectrumRecord) : s)),
      }));
      return result as SpectrumRecord;
    } catch {
      return null;
    }
  },
}));
