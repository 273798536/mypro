import { create } from 'zustand';
import { ErrorRecord, AnomalyFilter, ChangedFilter, CalculationStep, Point } from '@/types';
import { mockRecords } from '@/data/mockRecords';
import { computeConvexHullArea } from '@/utils/convexHull';

interface AppState {
  records: ErrorRecord[];
  filterAnomaly: AnomalyFilter;
  filterChanged: ChangedFilter;
  rerunResult: Record<string, { area: number | null; steps: CalculationStep[]; hull: Point[] }>;
  setFilterAnomaly: (f: AnomalyFilter) => void;
  setFilterChanged: (f: ChangedFilter) => void;
  rerunRecord: (id: string) => void;
  getUniqueRecords: () => ErrorRecord[];
}

export const useStore = create<AppState>((set, get) => ({
  records: mockRecords,
  filterAnomaly: 'all',
  filterChanged: 'all',
  rerunResult: {},

  setFilterAnomaly: (f) => set({ filterAnomaly: f }),
  setFilterChanged: (f) => set({ filterChanged: f }),

  rerunRecord: (id) => {
    const rec = get().records.find((r) => r.id === id);
    if (!rec) return;
    const result = computeConvexHullArea(rec.inputPoints);
    set((state) => ({
      rerunResult: {
        ...state.rerunResult,
        [id]: { area: result.area, steps: result.steps, hull: result.hull },
      },
    }));
  },

  getUniqueRecords: () => {
    const seen = new Set<string>();
    return get().records.filter((r) => {
      if (seen.has(r.sampleId)) return false;
      seen.add(r.sampleId);
      return true;
    });
  },
}));
