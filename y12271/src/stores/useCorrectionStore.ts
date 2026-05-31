import { create } from 'zustand';
import type { SoundSource, CorrectionSnapshot } from '@/types';

interface CorrectionState {
  snapshots: CorrectionSnapshot[];
  isComparing: boolean;
  leftSnapshotId: string | null;
  rightSnapshotId: string | null;
  isDragMode: boolean;
  setDragMode: (on: boolean) => void;
  takeSnapshot: (sources: SoundSource[], seatReverbs: Record<string, number>, label: string) => string;
  startComparison: (leftId: string, rightId: string) => void;
  stopComparison: () => void;
}

export const useCorrectionStore = create<CorrectionState>((set) => ({
  snapshots: [],
  isComparing: false,
  leftSnapshotId: null,
  rightSnapshotId: null,
  isDragMode: false,
  setDragMode: (on) => set({ isDragMode: on }),
  takeSnapshot: (sources, seatReverbs, label) => {
    const id = `snap-${Date.now()}`;
    const snapshot: CorrectionSnapshot = {
      id,
      timestamp: Date.now(),
      soundSources: structuredClone(sources),
      seatReverbTimes: { ...seatReverbs },
      label,
    };
    set((state) => ({
      snapshots: [...state.snapshots, snapshot],
    }));
    return id;
  },
  startComparison: (leftId, rightId) =>
    set({ isComparing: true, leftSnapshotId: leftId, rightSnapshotId: rightId }),
  stopComparison: () =>
    set({ isComparing: false, leftSnapshotId: null, rightSnapshotId: null }),
}));
