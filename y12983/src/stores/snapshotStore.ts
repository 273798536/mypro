import { create } from 'zustand';
import type { TableSnapshot } from '@/types';
import { snapshotService } from '@/services/snapshotService';

interface SnapshotState {
  snapshots: TableSnapshot[];
  allSnapshots: TableSnapshot[];
  currentSnapshot: TableSnapshot | null;
  compareResult: ReturnType<typeof snapshotService.compare> | null;
  loading: boolean;

  fetchByGapId: (gapId: string) => void;
  fetchAll: () => void;
  fetchSnapshot: (id: string) => void;
  compareSnapshots: (id1: string, id2: string) => void;
  addSnapshot: (snapshot: Omit<TableSnapshot, 'id' | 'createdAt'>) => TableSnapshot;
  resetToMock: () => void;
}

export const useSnapshotStore = create<SnapshotState>((set, get) => ({
  snapshots: [],
  allSnapshots: [],
  currentSnapshot: null,
  compareResult: null,
  loading: false,

  fetchByGapId: (gapId: string) => {
    const snapshots = snapshotService.listByGapId(gapId);
    set({ snapshots });
  },

  fetchAll: () => {
    const allSnapshots = snapshotService.listAll();
    set({ allSnapshots });
  },

  fetchSnapshot: (id: string) => {
    const snapshot = snapshotService.get(id);
    set({ currentSnapshot: snapshot });
  },

  compareSnapshots: (id1: string, id2: string) => {
    const result = snapshotService.compare(id1, id2);
    set({ compareResult: result });
  },

  addSnapshot: (snapshot) => {
    const newSnapshot = snapshotService.add(snapshot);
    get().fetchByGapId(snapshot.gapId);
    get().fetchAll();
    return newSnapshot;
  },

  resetToMock: () => {
    snapshotService.resetToMock();
  },
}));
