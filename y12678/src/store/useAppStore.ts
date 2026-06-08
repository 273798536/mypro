import { create } from "zustand";
import type {
  ViewSnapshot,
  MeasurementRecord,
  SupplementRecord,
  CollisionResult,
  DataConflict,
} from "@/types";
import {
  mockViewSnapshots,
  mockMeasurementRecords,
  mockSupplementRecords,
  mockCollisionResults,
  mockDataConflicts,
} from "@/data/mockData";

interface AppState {
  viewSnapshots: ViewSnapshot[];
  measurementRecords: MeasurementRecord[];
  supplementRecords: SupplementRecord[];
  collisionResults: CollisionResult[];
  dataConflicts: DataConflict[];
  selectedRecordId: string | null;
  selectedCollisionId: string | null;
  activeSnapshotId: string | null;
  setSelectedRecordId: (id: string | null) => void;
  setSelectedCollisionId: (id: string | null) => void;
  setActiveSnapshotId: (id: string | null) => void;
  getSupplementByRecordId: (recordId: string) => SupplementRecord[];
  getRecordsBySnapshotId: (snapshotId: string) => MeasurementRecord[];
  getRecordsByIds: (ids: string[]) => MeasurementRecord[];
  getOutOfBoundsSnapshots: () => ViewSnapshot[];
  getCoordMismatchRecords: () => MeasurementRecord[];
  resolveConflict: (conflictId: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  viewSnapshots: mockViewSnapshots,
  measurementRecords: mockMeasurementRecords,
  supplementRecords: mockSupplementRecords,
  collisionResults: mockCollisionResults,
  dataConflicts: mockDataConflicts,
  selectedRecordId: null,
  selectedCollisionId: null,
  activeSnapshotId: null,

  setSelectedRecordId: (id) => set({ selectedRecordId: id }),
  setSelectedCollisionId: (id) => set({ selectedCollisionId: id }),
  setActiveSnapshotId: (id) => set({ activeSnapshotId: id }),

  getSupplementByRecordId: (recordId) =>
    get().supplementRecords.filter((s) => s.recordId === recordId),

  getRecordsBySnapshotId: (snapshotId) => {
    const snap = get().viewSnapshots.find((s) => s.id === snapshotId);
    if (!snap) return [];
    return get().measurementRecords.filter((r) => snap.recordIds.includes(r.id));
  },

  getRecordsByIds: (ids) =>
    get().measurementRecords.filter((r) => ids.includes(r.id)),

  getOutOfBoundsSnapshots: () =>
    get().viewSnapshots.filter((s) => s.outOfBoundsCount > 0),

  getCoordMismatchRecords: () => {
    const records = get().measurementRecords;
    const systems = new Set(records.map((r) => r.coordinateSystem));
    if (systems.size <= 1) return [];
    return records;
  },

  resolveConflict: (conflictId) =>
    set((state) => ({
      dataConflicts: state.dataConflicts.map((c) =>
        c.id === conflictId ? { ...c, status: "resolved" } : c
      ),
    })),
}));
