import { create } from 'zustand';
import type { SimulationRecord, StatsSummary, HistoryVersion } from '@shared/types';
import { api } from '@/lib/api';

interface AppState {
  records: SimulationRecord[];
  stats: StatsSummary | null;
  currentRecord: SimulationRecord | null;
  history: HistoryVersion[];
  loading: boolean;
  error: string | null;
  fetchStats: () => Promise<void>;
  fetchRecords: (params?: { riskLevel?: string; anomalyType?: string; search?: string }) => Promise<void>;
  fetchRecord: (id: string) => Promise<void>;
  fetchHistory: (id: string) => Promise<void>;
  updateRecord: (id: string, payload: any) => Promise<boolean>;
  addSection: (id: string, section: any) => Promise<boolean>;
  rollbackVersion: (recordId: string, versionId: string) => Promise<boolean>;
  setCurrentRecord: (r: SimulationRecord | null) => void;
}

export const useStore = create<AppState>((set, get) => ({
  records: [],
  stats: null,
  currentRecord: null,
  history: [],
  loading: false,
  error: null,

  fetchStats: async () => {
    set({ loading: true });
    const res = await api.getStats();
    if (res.success && res.data) set({ stats: res.data });
    set({ loading: false });
  },

  fetchRecords: async (params) => {
    set({ loading: true });
    const res = await api.getRecords(params);
    if (res.success && res.data) set({ records: res.data });
    else set({ error: res.error || '加载记录失败' });
    set({ loading: false });
  },

  fetchRecord: async (id) => {
    set({ loading: true });
    const res = await api.getRecord(id);
    if (res.success && res.data) set({ currentRecord: res.data });
    set({ loading: false });
  },

  fetchHistory: async (id) => {
    set({ loading: true });
    const res = await api.getHistory(id);
    if (res.success && res.data) set({ history: res.data });
    set({ loading: false });
  },

  updateRecord: async (id, payload) => {
    const res = await api.updateRecord(id, payload);
    if (res.success && res.data) {
      set({ currentRecord: res.data.record });
      const records = get().records;
      const idx = records.findIndex(r => r.id === id);
      if (idx >= 0) {
        const next = [...records];
        next[idx] = res.data.record;
        set({ records: next });
      }
      return true;
    }
    return false;
  },

  addSection: async (id, section) => {
    const res = await api.addSection(id, section);
    if (res.success && res.data) {
      set({ currentRecord: res.data });
      const records = get().records;
      const idx = records.findIndex(r => r.id === id);
      if (idx >= 0) {
        const next = [...records];
        next[idx] = res.data;
        set({ records: next });
      }
      return true;
    }
    return false;
  },

  rollbackVersion: async (recordId, versionId) => {
    const res = await api.rollbackVersion(recordId, versionId);
    if (res.success && res.data) {
      set({ currentRecord: res.data });
      return true;
    }
    return false;
  },

  setCurrentRecord: (r) => set({ currentRecord: r }),
}));
