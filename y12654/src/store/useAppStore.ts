import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AnomalyType,
  ProcessStatus,
  MeasurementRecord,
  RunVersion,
  SavedViewpoint,
  InterceptionRule,
} from '@/types';
import { mockRecords, mockVersions, mockViewpoints, mockInterceptionRules } from '@/data/mockData';
import { PROCESS_STATUS_NEXT_ACTION } from '@/types';

interface AppState {
  records: MeasurementRecord[];
  versions: RunVersion[];
  viewpoints: SavedViewpoint[];
  interceptionRules: InterceptionRule[];
  currentRunId: string;
  filterAnomalyType: AnomalyType | null;
  filterProcessStatus: ProcessStatus | null;
  flashAnomalyId: string | null;

  setCurrentRunId: (id: string) => void;
  setFilterAnomalyType: (t: AnomalyType | null) => void;
  setFilterProcessStatus: (s: ProcessStatus | null) => void;
  setFlashAnomalyId: (id: string | null) => void;

  getFilteredRecords: () => MeasurementRecord[];
  getAnomalySummary: (runId?: string) => Record<AnomalyType, { count: number; nextAction: string }>;
  getRecordById: (id: string) => MeasurementRecord | undefined;
  getViewpointsByRecordId: (recordId: string) => SavedViewpoint[];

  updateRiskRemarks: (recordId: string, remarks: string, firstAnomalyId: string) => void;
  updateDecision: (recordId: string, decision: ProcessStatus) => void;
  updateManualNote: (recordId: string, note: string) => void;

  saveViewpoint: (vp: Omit<SavedViewpoint, 'id' | 'createdAt'>) => SavedViewpoint;
  renameViewpoint: (id: string, name: string) => void;
  deleteViewpoint: (id: string) => void;

  importRecords: () => { inserted: number; anomalies: number };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      records: mockRecords,
      versions: mockVersions,
      viewpoints: mockViewpoints,
      interceptionRules: mockInterceptionRules,
      currentRunId: 'run-002',
      filterAnomalyType: null,
      filterProcessStatus: null,
      flashAnomalyId: null,

      setCurrentRunId: (id) => set({ currentRunId: id }),
      setFilterAnomalyType: (t) => set({ filterAnomalyType: t }),
      setFilterProcessStatus: (s) => set({ filterProcessStatus: s }),
      setFlashAnomalyId: (id) => {
        set({ flashAnomalyId: id });
        if (id) {
          setTimeout(() => set({ flashAnomalyId: null }), 600);
        }
      },

      getFilteredRecords: () => {
        const { records, currentRunId, filterAnomalyType, filterProcessStatus } = get();
        return records
          .filter((r) => r.runId === currentRunId)
          .filter((r) => (filterAnomalyType ? r.anomalies.some((a) => a.type === filterAnomalyType) : true))
          .filter((r) =>
            filterProcessStatus
              ? r.anomalies.every((a) => a.status === filterProcessStatus) || r.opinion.decision === filterProcessStatus
              : true,
          );
      },

      getAnomalySummary: (runId) => {
        const { records } = get();
        const targetRunId = runId ?? get().currentRunId;
        const runRecords = records.filter((r) => r.runId === targetRunId);
        const types: AnomalyType[] = ['coordinate_mismatch', 'timing_desync', 'precision_overrun', 'data_missing'];
        const result = {} as Record<AnomalyType, { count: number; nextAction: string }>;
        for (const t of types) {
          const count = runRecords.reduce((sum, r) => sum + r.anomalies.filter((a) => a.type === t).length, 0);
          result[t] = { count, nextAction: PROCESS_STATUS_NEXT_ACTION[t] };
        }
        return result;
      },

      getRecordById: (id) => get().records.find((r) => r.id === id),

      getViewpointsByRecordId: (recordId) => get().viewpoints.filter((v) => v.recordId === recordId),

      updateRiskRemarks: (recordId, remarks, firstAnomalyId) => {
        set((state) => ({
          records: state.records.map((r) =>
            r.id === recordId ? { ...r, opinion: { ...r.opinion, riskRemarks: remarks } } : r,
          ),
          flashAnomalyId: firstAnomalyId,
        }));
        setTimeout(() => set({ flashAnomalyId: null }), 600);
      },

      updateDecision: (recordId, decision) =>
        set((state) => ({
          records: state.records.map((r) =>
            r.id === recordId
              ? {
                  ...r,
                  opinion: { ...r.opinion, decision },
                  anomalies: r.anomalies.map((a) => ({ ...a, status: decision })),
                }
              : r,
          ),
        })),

      updateManualNote: (recordId, note) =>
        set((state) => ({
          records: state.records.map((r) =>
            r.id === recordId ? { ...r, opinion: { ...r.opinion, manualNote: note } } : r,
          ),
        })),

      saveViewpoint: (vp) => {
        const newVp: SavedViewpoint = {
          ...vp,
          id: `vp-${Date.now()}`,
          createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        };
        set((state) => ({ viewpoints: [...state.viewpoints, newVp] }));
        return newVp;
      },

      renameViewpoint: (id, name) =>
        set((state) => ({
          viewpoints: state.viewpoints.map((v) => (v.id === id ? { ...v, name } : v)),
        })),

      deleteViewpoint: (id) =>
        set((state) => ({ viewpoints: state.viewpoints.filter((v) => v.id !== id) })),

      importRecords: () => {
        const newRun: RunVersion = {
          id: `run-${String(Date.now()).slice(-6)}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          label: '本次运行',
        };
        set((state) => ({
          versions: [newRun, ...state.versions.map((v) => (v.label === '本次运行' ? { ...v, label: '上次运行' as const } : v))],
          currentRunId: newRun.id,
        }));
        return { inserted: 0, anomalies: 0 };
      },
    }),
    {
      name: 'organelle-3d-store',
      partialize: (state) => ({
        records: state.records,
        viewpoints: state.viewpoints,
        versions: state.versions,
        currentRunId: state.currentRunId,
      }),
    },
  ),
);
