import { create } from 'zustand';
import type { VolcanoRecord } from '@shared/types';
import { api } from '@/lib/api';

interface AppState {
  records: VolcanoRecord[];
  loading: boolean;
  error: string | null;
  fetchRecords: () => Promise<void>;
  getRecord: (id: string) => VolcanoRecord | undefined;
}

export const useAppStore = create<AppState>((set, get) => ({
  records: [],
  loading: false,
  error: null,
  fetchRecords: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.getRecords();
      set({ records: res.data, loading: false });
    } catch (err: unknown) {
      if (err instanceof Error) {
        set({ error: err.message, loading: false });
      }
    }
  },
  getRecord: (id: string) => get().records.find(r => r.id === id),
}));
