import { create } from "zustand";
import type { GameSnapshot } from "@/types";

interface ReplayStore {
  snapshots: GameSnapshot[];
  currentStep: number;
  selectedSnapshot: GameSnapshot | null;

  loadSnapshots: (snapshots: GameSnapshot[]) => void;
  goToStep: (step: number) => void;
  reset: () => void;
}

export const useReplayStore = create<ReplayStore>((set, get) => ({
  snapshots: [],
  currentStep: 0,
  selectedSnapshot: null,

  loadSnapshots: (snapshots: GameSnapshot[]) => {
    set({
      snapshots,
      currentStep: 0,
      selectedSnapshot: snapshots.length > 0 ? snapshots[0] : null,
    });
  },

  goToStep: (step: number) => {
    const { snapshots } = get();
    const snapshot = snapshots.find((s) => s.step === step) ?? null;
    set({ currentStep: step, selectedSnapshot: snapshot });
  },

  reset: () => set({ snapshots: [], currentStep: 0, selectedSnapshot: null }),
}));
