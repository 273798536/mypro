import { create } from "zustand";
import type { LightRecord, RecordFilter, HistoryEntry, TraceNode } from "../../shared/types";
import { api } from "../api/client";

interface RecordsState {
  records: LightRecord[];
  activeRecord: LightRecord | null;
  history: HistoryEntry[];
  trace: TraceNode[];
  filter: RecordFilter;
  loading: boolean;
  error: string | null;
  fetchRecords: (f?: RecordFilter) => Promise<void>;
  fetchRecord: (id: string) => Promise<void>;
  fetchHistory: (id: string) => Promise<void>;
  fetchTrace: (id: string) => Promise<void>;
  updateRecord: (id: string, updates: Partial<LightRecord>) => Promise<void>;
  setFilter: (f: RecordFilter) => void;
  reset: () => void;
}

export const useRecordsStore = create<RecordsState>((set, get) => ({
  records: [],
  activeRecord: null,
  history: [],
  trace: [],
  filter: {},
  loading: false,
  error: null,

  async fetchRecords(f) {
    set({ loading: true, error: null });
    try {
      const filter = { ...get().filter, ...(f ?? {}) };
      const res = await api.listRecords(filter);
      set({ records: res.data ?? [], filter, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  async fetchRecord(id) {
    set({ loading: true, error: null });
    try {
      const res = await api.getRecord(id);
      set({ activeRecord: res.data ?? null, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  async fetchHistory(id) {
    try {
      const res = await api.getHistory(id);
      set({ history: res.data ?? [] });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  async fetchTrace(id) {
    try {
      const res = await api.getTrace(id);
      set({ trace: res.data ?? [] });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  async updateRecord(id, updates) {
    set({ loading: true, error: null });
    try {
      const res = await api.updateRecord(id, updates);
      const updated = res.data;
      set((state) => ({
        activeRecord: updated ?? null,
        records: state.records.map((r) => (r.id === id ? updated ?? r : r)),
        loading: false,
      }));
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  setFilter(f) {
    set({ filter: { ...get().filter, ...f } });
  },

  reset() {
    set({
      activeRecord: null,
      history: [],
      trace: [],
      error: null,
    });
  },
}));
