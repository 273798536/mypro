import { create } from 'zustand';
import type { RiskOverview, BatchInfo } from '@/types';
import api from '@/lib/api';

interface AppState {
  currentBatchId: string;
  batches: BatchInfo[];
  riskOverview: RiskOverview | null;
  loading: Record<string, boolean>;
  selectedPlatformId: string | null;
  viewMode: 'fleet' | 'expert';

  setCurrentBatchId: (id: string) => void;
  setSelectedPlatformId: (id: string | null) => void;
  setViewMode: (mode: 'fleet' | 'expert') => void;
  fetchBatches: () => Promise<void>;
  fetchRiskOverview: () => Promise<void>;
  loadInitialData: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentBatchId: 'batch_2026_06_12',
  batches: [],
  riskOverview: null,
  loading: {},
  selectedPlatformId: null,
  viewMode: 'expert',

  setCurrentBatchId: (id) => set({ currentBatchId: id }),
  setSelectedPlatformId: (id) => set({ selectedPlatformId: id }),
  setViewMode: (mode) => set({ viewMode: mode }),

  fetchBatches: async () => {
    set({ loading: { ...get().loading, batches: true } });
    try {
      const res = await api.getBatches();
      set({ batches: res.items });
      if (res.items.length > 0 && !get().currentBatchId) {
        set({ currentBatchId: res.items[0].id });
      }
    } finally {
      set({ loading: { ...get().loading, batches: false } });
    }
  },

  fetchRiskOverview: async () => {
    set({ loading: { ...get().loading, riskOverview: true } });
    try {
      const data = await api.getRiskOverview(get().currentBatchId);
      set({ riskOverview: data });
    } finally {
      set({ loading: { ...get().loading, riskOverview: false } });
    }
  },

  loadInitialData: async () => {
    await Promise.all([
      get().fetchBatches(),
      get().fetchRiskOverview(),
    ]);
  },
}));

export default useAppStore;
