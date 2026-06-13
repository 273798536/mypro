import { create } from 'zustand';
import type { SpeckleDataset, AnomalyInfo } from '@/types';
import { mockDataset } from '@/data/mockDataset';

interface SpeckleState {
  dataset: SpeckleDataset | null;
  selectedAnomaly: AnomalyInfo | null;
  isSummaryOpen: boolean;
  isRerunning: boolean;
  rerunProgress: number;
  selectedVersionId: string | null;
  loadSample: () => void;
  clearDataset: () => void;
  selectAnomaly: (anomaly: AnomalyInfo | null) => void;
  setSummaryOpen: (open: boolean) => void;
  startRerun: () => void;
  selectVersion: (versionId: string | null) => void;
}

export const useSpeckleStore = create<SpeckleState>((set, get) => ({
  dataset: null,
  selectedAnomaly: null,
  isSummaryOpen: false,
  isRerunning: false,
  rerunProgress: 0,
  selectedVersionId: null,

  loadSample: () => {
    set({
      dataset: mockDataset,
      selectedAnomaly: null,
      selectedVersionId: mockDataset.versions[mockDataset.versions.length - 1].id,
    });
  },

  clearDataset: () => {
    set({ dataset: null, selectedAnomaly: null, selectedVersionId: null });
  },

  selectAnomaly: (anomaly) => {
    set({ selectedAnomaly: anomaly });
  },

  setSummaryOpen: (open) => {
    set({ isSummaryOpen: open });
  },

  startRerun: () => {
    set({ isRerunning: true, rerunProgress: 0 });
    const interval = setInterval(() => {
      const current = get().rerunProgress;
      if (current >= 100) {
        clearInterval(interval);
        set({ isRerunning: false, rerunProgress: 100 });
        setTimeout(() => set({ rerunProgress: 0 }), 800);
      } else {
        set({ rerunProgress: Math.min(current + 8, 100) });
      }
    }, 120);
  },

  selectVersion: (versionId) => {
    set({ selectedVersionId: versionId });
  },
}));
