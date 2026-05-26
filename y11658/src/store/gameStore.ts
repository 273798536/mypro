import { create } from "zustand";
import type { GameState, StepEvent } from "@/types";
import { gradeFromScore } from "@/utils/engine";

type GameStore = GameState & {
  start: (pos: { x: number; y: number; z: number; rot: number }) => void;
  record: (event: StepEvent, terminate?: boolean) => void;
  finish: () => "S" | "A" | "B" | "C" | "F";
  reset: () => void;
};

export const useGameStore = create<GameStore>((set, get) => ({
  status: "idle",
  position: { x: 0, y: 0, z: 0, rot: 0 },
  score: 100,
  step: 0,
  events: [],
  lastPenalty: undefined,

  start: (pos) =>
    set({
      status: "running",
      position: pos,
      score: 100,
      step: 0,
      events: [],
      lastPenalty: undefined,
    }),

  record: (event, terminate) =>
    set((s) => ({
      step: s.step + 1,
      position: event.position,
      score: Math.max(0, s.score + event.score),
      events: [...s.events, event],
      lastPenalty: event.penalty,
      status: terminate ? "terminated" : s.status,
    })),

  finish: () => {
    const grade = gradeFromScore(get().score);
    set({ status: "finished" });
    return grade;
  },

  reset: () =>
    set({
      status: "idle",
      position: { x: 0, y: 0, z: 0, rot: 0 },
      score: 100,
      step: 0,
      events: [],
      lastPenalty: undefined,
    }),
}));
