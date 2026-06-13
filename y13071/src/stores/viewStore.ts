import { create } from "zustand";
import { seedSnapshots } from "@/utils/mockData";
import type {
  CameraState,
  FilterState,
  ViewSnapshot,
} from "@/shared/types";
import { loadStorage, saveStorage } from "@/utils/storage";

interface ViewState {
  snapshots: ViewSnapshot[];
  pendingRestoreSnapshotId: string | null;
  saveSnapshot: (input: {
    name: string;
    timestamp: number;
    camera: CameraState;
    filters: FilterState;
    selectedObjectId?: string;
    thumbnail?: string;
  }) => ViewSnapshot;
  deleteSnapshot: (id: string) => void;
  setPendingRestoreSnapshotId: (id: string | null) => void;
}

export const useViewStore = create<ViewState>((set, get) => ({
  snapshots: loadStorage("snapshots", seedSnapshots),
  pendingRestoreSnapshotId: null,
  saveSnapshot: ({
    name,
    timestamp,
    camera,
    filters,
    selectedObjectId,
    thumbnail,
  }) => {
    const snap: ViewSnapshot = {
      id: `snap-${Date.now()}`,
      name,
      timestamp,
      camera,
      filters,
      selectedObjectId,
      thumbnail,
      createdAt: Date.now(),
    };
    const next = [snap, ...get().snapshots];
    set({ snapshots: next });
    saveStorage("snapshots", next);
    return snap;
  },
  deleteSnapshot: (id) => {
    const next = get().snapshots.filter((s) => s.id !== id);
    set({ snapshots: next });
    saveStorage("snapshots", next);
  },
  setPendingRestoreSnapshotId: (id) => set({ pendingRestoreSnapshotId: id }),
}));
