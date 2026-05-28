import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { IntegrationResult, Anomaly } from '@/types';

interface ResultState {
  results: IntegrationResult[];
  addResult: (result: IntegrationResult) => void;
  addResults: (results: IntegrationResult[]) => void;
  removeResult: (id: string) => void;
  clearResults: () => void;
  getResultsForPath: (pathId: string) => IntegrationResult[];
  getLatestResultForPath: (pathId: string) => IntegrationResult | null;
  getAllAnomalies: () => Anomaly[];
}

export const useResultStore = create<ResultState>()(
  persist(
    (set, get) => ({
      results: [],

      addResult: (result) =>
        set((state) => ({
          results: [...state.results, result],
        })),

      addResults: (newResults) =>
        set((state) => ({
          results: [...state.results, ...newResults],
        })),

      removeResult: (id) =>
        set((state) => ({
          results: state.results.filter((r) => r.id !== id),
        })),

      clearResults: () =>
        set({
          results: [],
        }),

      getResultsForPath: (pathId) =>
        get().results.filter((r) => r.pathId === pathId),

      getLatestResultForPath: (pathId) => {
        const pathResults = get()
          .results.filter((r) => r.pathId === pathId)
          .sort((a, b) => new Date(b.computedAt).getTime() - new Date(a.computedAt).getTime());
        return pathResults[0] || null;
      },

      getAllAnomalies: () =>
        get().results.flatMap((r) => r.anomalies),
    }),
    {
      name: 'result-store',
    }
  )
);
