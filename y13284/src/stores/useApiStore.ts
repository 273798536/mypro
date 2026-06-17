import { create } from 'zustand';
import type { ApiLog } from '@/shared/types';

interface ApiState {
  logs: ApiLog[];
  showDrawer: boolean;
  drawerTab: 'start' | 'rerun' | 'view';
  viewComplaintId: string | null;
  lastRawJson: string;
  lastMappedTable: Record<string, unknown>[];
  isLoading: boolean;
}

interface ApiActions {
  setShowDrawer: (v: boolean) => void;
  setDrawerTab: (tab: 'start' | 'rerun' | 'view') => void;
  setViewComplaintId: (id: string | null) => void;
  appendLog: (log: ApiLog) => void;
  setLastViewResult: (
    rawJson: string,
    table: Record<string, unknown>[]
  ) => void;
  setLoading: (v: boolean) => void;
}

export type ApiStore = ApiState & ApiActions;

export const useApiStore = create<ApiStore>((set) => ({
  logs: [],
  showDrawer: false,
  drawerTab: 'start',
  viewComplaintId: null,
  lastRawJson: '',
  lastMappedTable: [],
  isLoading: false,

  setShowDrawer: (v) => set({ showDrawer: v }),

  setDrawerTab: (tab) => set({ drawerTab: tab }),

  setViewComplaintId: (id) => set({ viewComplaintId: id }),

  appendLog: (log) => set((s) => ({ logs: [...s.logs, log] })),

  setLastViewResult: (rawJson, table) =>
    set({ lastRawJson: rawJson, lastMappedTable: table }),

  setLoading: (v) => set({ isLoading: v }),
}));
