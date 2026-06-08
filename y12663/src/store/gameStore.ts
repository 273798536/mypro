import { create } from "zustand";
import type { GameStateShape, OperationLog } from "@/types";
import { uid } from "@/utils/format";

interface GameStore extends GameStateShape {
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  settle: () => void;
  getElapsedMs: () => number;
  incrementStat: (
    key: "totalRecords" | "overrunCount" | "duplicateBlocked" | "exportedCount",
    delta?: number,
  ) => void;
  selectPlane: (planeId: string | null) => void;
  selectConclusion: (conclusionId: string | null) => void;
  setCameraFocus: (
    focus: { position: [number, number, number]; target: [number, number, number] } | null,
  ) => void;
  pushLog: (log: Omit<OperationLog, "id" | "roundId" | "timestamp">) => void;
  logs: OperationLog[];
}

const initialState: GameStateShape = {
  roundId: null,
  status: "idle",
  startedAt: null,
  lastPausedAt: null,
  accumulatedMs: 0,
  stats: {
    totalRecords: 0,
    overrunCount: 0,
    duplicateBlocked: 0,
    exportedCount: 0,
  },
  selectedPlaneId: null,
  selectedConclusionId: null,
  cameraFocus: null,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,
  logs: [],

  start: () => {
    const roundId = uid("round-");
    set({
      roundId,
      status: "running",
      startedAt: Date.now(),
      lastPausedAt: null,
      accumulatedMs: 0,
      stats: {
        totalRecords: 0,
        overrunCount: 0,
        duplicateBlocked: 0,
        exportedCount: 0,
      },
      selectedPlaneId: null,
      selectedConclusionId: null,
      cameraFocus: null,
      logs: [],
    });
  },

  pause: () => {
    const { status, startedAt, accumulatedMs } = get();
    if (status !== "running" || !startedAt) return;
    set({
      status: "paused",
      lastPausedAt: Date.now(),
      accumulatedMs: accumulatedMs + (Date.now() - startedAt),
    });
  },

  resume: () => {
    const { status } = get();
    if (status !== "paused") return;
    set({ status: "running", startedAt: Date.now(), lastPausedAt: null });
  },

  reset: () => {
    set({ ...initialState, logs: [] });
  },

  settle: () => {
    const { status, startedAt, accumulatedMs } = get();
    let finalAccumulated = accumulatedMs;
    if (status === "running" && startedAt) {
      finalAccumulated = accumulatedMs + (Date.now() - startedAt);
    }
    set({ status: "settled", startedAt: null, accumulatedMs: finalAccumulated });
  },

  getElapsedMs: () => {
    const { status, startedAt, accumulatedMs } = get();
    if (status === "running" && startedAt) {
      return accumulatedMs + (Date.now() - startedAt);
    }
    return accumulatedMs;
  },

  incrementStat: (key, delta = 1) => {
    set((s) => ({
      stats: { ...s.stats, [key]: s.stats[key] + delta },
    }));
  },

  selectPlane: (planeId) => set({ selectedPlaneId: planeId }),
  selectConclusion: (conclusionId) => set({ selectedConclusionId: conclusionId }),
  setCameraFocus: (focus) => set({ cameraFocus: focus }),

  pushLog: (log) => {
    const { roundId } = get();
    if (!roundId) return;
    set((s) => ({
      logs: [
        {
          ...log,
          id: uid("op-"),
          roundId,
          timestamp: Date.now(),
        },
        ...s.logs,
      ],
    }));
  },
}));
