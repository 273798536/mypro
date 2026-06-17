import { create } from 'zustand';
import type { Batch, Anomaly, Correction } from '../../shared/types';

interface Store {
  currentBatchId: string;
  batches: Batch[];
  anomalies: Anomaly[];
  corrections: Correction[];
  filterType: string;
  filterStatus: string;
  setCurrentBatchId: (id: string) => void;
  setBatches: (b: Batch[]) => void;
  setAnomalies: (a: Anomaly[]) => void;
  setCorrections: (c: Correction[]) => void;
  setFilterType: (t: string) => void;
  setFilterStatus: (s: string) => void;
  updateAnomalyStatus: (id: string, status: Anomaly['status']) => void;
  addOrUpdateCorrection: (c: Correction) => void;
}

export const useStore = create<Store>((set) => ({
  currentBatchId: 'RUN-20260617-001',
  batches: [],
  anomalies: [],
  corrections: [],
  filterType: 'all',
  filterStatus: 'all',
  setCurrentBatchId: (id) => set({ currentBatchId: id }),
  setBatches: (b) => set({ batches: b }),
  setAnomalies: (a) => set({ anomalies: a }),
  setCorrections: (c) => set({ corrections: c }),
  setFilterType: (t) => set({ filterType: t }),
  setFilterStatus: (s) => set({ filterStatus: s }),
  updateAnomalyStatus: (id, status) =>
    set((state) => ({
      anomalies: state.anomalies.map((a) => (a.id === id ? { ...a, status } : a)),
    })),
  addOrUpdateCorrection: (c) =>
    set((state) => {
      const idx = state.corrections.findIndex((x) => x.anomalyId === c.anomalyId);
      if (idx >= 0) {
        const next = [...state.corrections];
        next[idx] = c;
        return { corrections: next };
      }
      return { corrections: [...state.corrections, c] };
    }),
}));
