import { create } from 'zustand';
import { api } from '@/lib/api';
import type {
  ListRunResult,
  RampListItem,
  RampStatus,
  Source,
} from '@shared/types';

export interface Filters {
  source?: Source;
  status?: RampStatus;
  overriding?: boolean;
}

interface RampStore {
  ramps: RampListItem[];
  loading: boolean;
  error: string | null;
  filters: Filters;
  lastRun: ListRunResult | null;
  toast: string | null;
  fetchRamps: () => Promise<void>;
  setFilter: (f: Partial<Filters>) => void;
  resetFilters: () => void;
  generate: () => Promise<void>;
  rerun: () => Promise<void>;
  showToast: (msg: string) => void;
  clearToast: () => void;
}

export const useRampStore = create<RampStore>((set, get) => ({
  ramps: [],
  loading: false,
  error: null,
  filters: {},
  lastRun: null,
  toast: null,
  fetchRamps: async () => {
    set({ loading: true, error: null });
    try {
      const ramps = await api.listRamps(get().filters);
      set({ ramps, loading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '加载失败', loading: false });
    }
  },
  setFilter: (f) => {
    set({ filters: { ...get().filters, ...f } });
    void get().fetchRamps();
  },
  resetFilters: () => {
    set({ filters: {} });
    void get().fetchRamps();
  },
  generate: async () => {
    set({ loading: true, error: null });
    try {
      const lastRun = await api.generate();
      await get().fetchRamps();
      set({ lastRun, loading: false, toast: lastRun.message });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '启动失败', loading: false });
    }
  },
  rerun: async () => {
    set({ loading: true, error: null });
    try {
      const lastRun = await api.rerun();
      await get().fetchRamps();
      set({ lastRun, loading: false, toast: lastRun.message });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '重跑失败', loading: false });
    }
  },
  showToast: (msg) => set({ toast: msg }),
  clearToast: () => set({ toast: null }),
}));
