import { create } from 'zustand';
import type { Anomaly, SpeciesSynonymCheck, AnomalyType, AnomalySeverity } from '../types';
import {
  getAnomalies,
  setAnomalies,
  getSpeciesSynonymChecks,
  setSpeciesSynonymChecks,
} from '../utils/storage';
import { getAnomalySummary as getAnomalySummaryUtil } from '../utils/anomaly';

interface ReviewState {
  anomalies: Anomaly[];
  synonymChecks: SpeciesSynonymCheck[];
  init: () => void;
  getAnomaliesByRun: (runId: string) => Anomaly[];
  getAnomaliesByType: (type: AnomalyType) => Anomaly[];
  getUnresolvedAnomalies: () => Anomaly[];
  resolveAnomaly: (id: string, resolvedBy: string) => void;
  getSynonymChecksByRun: (runId: string) => SpeciesSynonymCheck[];
  getUnresolvedSynonymChecks: () => SpeciesSynonymCheck[];
  resolveSynonymCheck: (id: string, resolvedBy: string) => void;
  getAnomalySummary: () => {
    total: number;
    byType: Record<AnomalyType, number>;
    bySeverity: Record<AnomalySeverity, number>;
    resolved: number;
    unresolved: number;
  };
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  anomalies: [],
  synonymChecks: [],

  init: () => {
    set({
      anomalies: getAnomalies(),
      synonymChecks: getSpeciesSynonymChecks(),
    });
  },

  getAnomaliesByRun: (runId) => {
    return get().anomalies.filter((a) => a.run_id === runId);
  },

  getAnomaliesByType: (type) => {
    return get().anomalies.filter((a) => a.type === type);
  },

  getUnresolvedAnomalies: () => {
    return get().anomalies.filter((a) => !a.resolved);
  },

  resolveAnomaly: (id, resolvedBy) =>
    set((state) => {
      const newAnomalies = state.anomalies.map((a) =>
        a.id === id
          ? { ...a, resolved: true, resolved_at: new Date().toISOString() }
          : a
      );
      setAnomalies(newAnomalies);
      return { anomalies: newAnomalies };
    }),

  getSynonymChecksByRun: (runId) => {
    return get().synonymChecks.filter((s) => s.run_id === runId);
  },

  getUnresolvedSynonymChecks: () => {
    return get().synonymChecks.filter((s) => !s.resolved);
  },

  resolveSynonymCheck: (id, resolvedBy) =>
    set((state) => {
      const newChecks = state.synonymChecks.map((s) =>
        s.id === id ? { ...s, resolved: true } : s
      );
      setSpeciesSynonymChecks(newChecks);
      return { synonymChecks: newChecks };
    }),

  getAnomalySummary: () => {
    return getAnomalySummaryUtil(get().anomalies);
  },
}));
