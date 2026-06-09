import { create } from "zustand";
import type { Session, CutAxis, CutPlaneState } from "@/types";
import { getSceneById } from "@/data/mock/scenes";

interface GameState {
  session: Session | null;
  cutPlane: CutPlaneState;
  elapsedSeconds: number;
  isPaused: boolean;
  activeSceneId: string | null;

  startSession: (sceneId: string) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  resetSession: () => void;
  completeSession: (score: number, accuracy: number) => void;
  setCutValue: (axis: CutAxis, value: number) => void;
  setActiveAxis: (axis: CutAxis) => void;
  tick: () => void;
  loadSession: (sessionId: string) => void;
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function loadSessions(): Record<string, Session> {
  try {
    const raw = localStorage.getItem("pore-sessions");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSession(session: Session) {
  const all = loadSessions();
  all[session.id] = session;
  localStorage.setItem("pore-sessions", JSON.stringify(all));
}

export const useGameStore = create<GameState>((set, get) => ({
  session: null,
  cutPlane: { x: 0, y: 0, z: 0, activeAxis: "y" },
  elapsedSeconds: 0,
  isPaused: false,
  activeSceneId: null,

  startSession: (sceneId: string) => {
    const scene = getSceneById(sceneId);
    if (!scene) return;
    const session: Session = {
      id: makeId("sess"),
      sceneId,
      startTime: Date.now(),
      endTime: null,
      score: 0,
      accuracy: 0,
      status: "playing",
    };
    saveSession(session);
    const defaultCut = {
      x: (scene.boundary.minX + scene.boundary.maxX) / 2,
      y: (scene.boundary.minY + scene.boundary.maxY) / 2,
      z: (scene.boundary.minZ + scene.boundary.maxZ) / 2,
      activeAxis: "y" as CutAxis,
    };
    set({
      session,
      cutPlane: defaultCut,
      elapsedSeconds: 0,
      isPaused: false,
      activeSceneId: sceneId,
    });
  },

  pauseSession: () => {
    const { session } = get();
    if (!session || session.status !== "playing") return;
    set({ isPaused: true });
  },

  resumeSession: () => {
    set({ isPaused: false });
  },

  resetSession: () => {
    const { activeSceneId } = get();
    if (activeSceneId) {
      get().startSession(activeSceneId);
    }
  },

  completeSession: (score: number, accuracy: number) => {
    const { session } = get();
    if (!session) return;
    const updated: Session = {
      ...session,
      endTime: Date.now(),
      score,
      accuracy,
      status: "completed",
    };
    saveSession(updated);
    set({ session: updated, isPaused: true });
  },

  setCutValue: (axis: CutAxis, value: number) => {
    set((s) => ({
      cutPlane: { ...s.cutPlane, [axis]: value },
    }));
  },

  setActiveAxis: (axis: CutAxis) => {
    set((s) => ({
      cutPlane: { ...s.cutPlane, activeAxis: axis },
    }));
  },

  tick: () => {
    const { isPaused, session } = get();
    if (!isPaused && session && session.status === "playing") {
      set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 }));
    }
  },

  loadSession: (sessionId: string) => {
    const all = loadSessions();
    const session = all[sessionId];
    if (session) {
      set({
        session,
        activeSceneId: session.sceneId,
        isPaused: true,
      });
    }
  },
}));

export function getAllSessions(): Session[] {
  return Object.values(loadSessions()).sort(
    (a, b) => b.startTime - a.startTime,
  );
}
