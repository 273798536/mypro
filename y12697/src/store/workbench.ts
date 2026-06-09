import { create } from 'zustand';
import type {
  Snapshot,
  ProcessingRecord,
  HistoryRecord,
  ReportData,
  TraceResult,
  SnapshotStatus,
  RiskLevel,
} from '../../shared/types';
import { api } from '../api/client';

interface WorkbenchState {
  snapshots: Snapshot[];
  currentSnapshot: Snapshot | null;
  currentRecord: ProcessingRecord | null;
  history: HistoryRecord[];
  report: ReportData | null;
  trace: TraceResult | null;
  filters: { status?: SnapshotStatus; riskLevel?: RiskLevel; keyword: string };
  loading: boolean;
  setFilters: (f: Partial<WorkbenchState['filters']>) => void;
  loadSnapshots: () => Promise<void>;
  importSnapshots: (files: File[]) => Promise<void>;
  loadSnapshot: (id: string) => Promise<void>;
  loadLatestRecord: (id: string) => Promise<void>;
  saveRecord: (id: string, data: Partial<ProcessingRecord>) => Promise<void>;
  loadHistory: (id: string) => Promise<void>;
  submitReview: (data: any) => Promise<void>;
  loadReport: (id: string) => Promise<void>;
  loadTrace: (id: string, anomalyId: string) => Promise<void>;
  clearTrace: () => void;
}

export const useWorkbench = create<WorkbenchState>((set, get) => ({
  snapshots: [],
  currentSnapshot: null,
  currentRecord: null,
  history: [],
  report: null,
  trace: null,
  filters: { keyword: '' },
  loading: false,

  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),

  loadSnapshots: async () => {
    set({ loading: true });
    try {
      const data = await api.listSnapshots(get().filters);
      set({ snapshots: data });
    } finally {
      set({ loading: false });
    }
  },

  importSnapshots: async (files) => {
    set({ loading: true });
    try {
      await api.importSnapshots(files);
      await get().loadSnapshots();
    } finally {
      set({ loading: false });
    }
  },

  loadSnapshot: async (id) => {
    set({ loading: true });
    try {
      const data = await api.getSnapshot(id);
      set({ currentSnapshot: data });
    } finally {
      set({ loading: false });
    }
  },

  loadLatestRecord: async (id) => {
    try {
      const data = await api.latestRecord(id);
      set({ currentRecord: data });
    } catch (_e) {
      set({ currentRecord: null });
    }
  },

  saveRecord: async (id, data) => {
    const saved = await api.saveRecord(id, data);
    set({ currentRecord: saved });
    await get().loadSnapshots();
  },

  loadHistory: async (id) => {
    const data = await api.listHistory(id);
    set({ history: data });
  },

  submitReview: async (data) => {
    await api.submitReview(data);
    await get().loadHistory(data.snapshotId);
    await get().loadLatestRecord(data.snapshotId);
    await get().loadSnapshots();
  },

  loadReport: async (id) => {
    const data = await api.getReport(id);
    set({ report: data });
  },

  loadTrace: async (id, anomalyId) => {
    const data = await api.trace(id, anomalyId);
    set({ trace: data });
  },

  clearTrace: () => set({ trace: null }),
}));
