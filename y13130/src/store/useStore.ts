import { create } from 'zustand';
import { ErrorRecord, AnomalyFilter, ChangedFilter, CalculationStep, Point, Material } from '@/types';
import { mockRecords } from '@/data/mockRecords';
import { computeConvexHullArea } from '@/utils/convexHull';

interface SubmitPayload {
  sampleId: string;
  title: string;
  inputPoints: Point[] | null;
  rawInput: string;
  materials?: Material[];
}

interface AppState {
  records: ErrorRecord[];
  filterAnomaly: AnomalyFilter;
  filterChanged: ChangedFilter;
  rerunResult: Record<string, { area: number | null; steps: CalculationStep[]; hull: Point[] }>;
  setFilterAnomaly: (f: AnomalyFilter) => void;
  setFilterChanged: (f: ChangedFilter) => void;
  rerunRecord: (id: string) => void;
  submitRecord: (payload: SubmitPayload) => ErrorRecord;
  getUniqueRecords: () => ErrorRecord[];
}

let nextId = 1000;

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

  submitRecord: (payload) => {
    const existing = get().records.find((r) => r.sampleId === payload.sampleId);
    if (existing) {
      const updated = {
        ...existing,
        submittedCount: existing.submittedCount + 1,
      };
      set((state) => ({
        records: state.records.map((r) => (r.id === existing.id ? updated : r)),
      }));
      return updated;
    }
    const result = computeConvexHullArea(payload.inputPoints);
    const rec: ErrorRecord = {
      id: `rec-${++nextId}`,
      sampleId: payload.sampleId,
      title: payload.title,
      inputPoints: payload.inputPoints,
      rawInput: payload.rawInput,
      expectedArea: null,
      actualArea: result.area,
      anomalyType: result.anomalyType,
      anomalyDetail:
        result.anomalyType === 'empty_set'
          ? '输入点集为空'
          : result.anomalyType === 'division_by_zero'
            ? '计算过程中触发除零'
            : undefined,
      materials: payload.materials || [],
      calculationSteps: result.steps,
      has口径Change: false,
      submittedCount: 1,
      status: 'pending',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    set((state) => ({ records: [...state.records, rec] }));
    return rec;
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
