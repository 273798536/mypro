import { create } from "zustand";
import type {
  GameSettings,
  GameSession,
  GameStateSnapshot,
  OperationLog,
  BuoyancyCalculation,
  ActiveInput,
  GamePhase,
  Submarine,
  BallastTank,
  TreasureChest,
  OceanEnvironment,
} from "@/physics/types";
import {
  createInitialState,
  tick,
  GameEngineState,
} from "@/physics/gameEngine";
import { resetOpCounter } from "@/physics/gameEngine";

interface GameStore {
  engine: GameEngineState;
  session: GameSession | null;
  savedSessions: GameSession[];
  activeInput: ActiveInput;
  replayFrame: number;
  isReplaying: boolean;
  replaySpeed: number;

  initGame: (settings: GameSettings) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  gameTick: () => void;
  setActiveInput: (input: Partial<ActiveInput>) => void;
  resetInput: () => void;
  endGame: () => void;
  setReplayFrame: (frame: number) => void;
  toggleReplay: () => void;
  setReplaySpeed: (speed: number) => void;
  getSnapshotAtFrame: (frame: number) => GameStateSnapshot | null;
  addTreasureMode: () => void;
}

const defaultInput: ActiveInput = {
  left: false,
  right: false,
  up: false,
  down: false,
  fill: false,
  drain: false,
};

export const useGameStore = create<GameStore>((set, get) => ({
  engine: createInitialState({
    enableDensityZones: true,
    enableOxygen: true,
    enableCollision: true,
    withTreasure: false,
  }),
  session: null,
  savedSessions: [],
  activeInput: { ...defaultInput },
  replayFrame: 0,
  isReplaying: false,
  replaySpeed: 1,

  initGame: (settings: GameSettings) => {
    resetOpCounter();
    const engine = createInitialState(settings);
    set({
      engine,
      session: {
        id: `session-${Date.now()}`,
        startTime: Date.now(),
        endTime: null,
        withTreasure: settings.withTreasure,
        snapshots: [],
        operations: [],
        calculations: [],
        result: null,
      },
      activeInput: { ...defaultInput },
      replayFrame: 0,
      isReplaying: false,
    });
  },

  startGame: () => {
    const { engine } = get();
    set({
      engine: { ...engine, phase: "playing" },
    });
  },

  pauseGame: () => {
    const { engine } = get();
    set({ engine: { ...engine, phase: "paused" } });
  },

  resumeGame: () => {
    const { engine } = get();
    set({ engine: { ...engine, phase: "playing" } });
  },

  gameTick: () => {
    const { engine, activeInput, session } = get();
    if (engine.phase !== "playing") return;

    const stateCopy: GameEngineState = {
      submarine: { ...engine.submarine },
      ballastTank: { ...engine.ballastTank },
      treasureChest: engine.treasureChest ? { ...engine.treasureChest } : null,
      environment: {
        ...engine.environment,
        densityZones: [...engine.environment.densityZones],
      },
      settings: { ...engine.settings },
      buoyancy: { ...engine.buoyancy },
      frame: engine.frame,
      result: engine.result,
      phase: engine.phase,
      warnings: [...engine.warnings],
      lastOperation: engine.lastOperation,
    };

    const newState = tick(stateCopy, activeInput);

    const snapshot: GameStateSnapshot = {
      frame: newState.frame,
      submarine: { ...newState.submarine },
      ballastTank: { ...newState.ballastTank },
      treasureChest: newState.treasureChest ? { ...newState.treasureChest } : null,
      environment: { ...newState.environment },
      buoyancy: { ...newState.buoyancy },
      operation: newState.lastOperation ? { ...newState.lastOperation } : null,
      result: newState.result ? { ...newState.result } : null,
    };

    const updatedSession = session
      ? {
          ...session,
          snapshots: [...session.snapshots, snapshot],
          operations: newState.lastOperation
            ? [...session.operations, { ...newState.lastOperation }]
            : session.operations,
          calculations: [...session.calculations, { ...newState.buoyancy }],
          result: newState.result ? { ...newState.result } : null,
          endTime: newState.result ? Date.now() : null,
        }
      : null;

    set({
      engine: newState,
      session: updatedSession,
    });
  },

  setActiveInput: (input: Partial<ActiveInput>) => {
    const { activeInput } = get();
    set({ activeInput: { ...activeInput, ...input } });
  },

  resetInput: () => {
    set({ activeInput: { ...defaultInput } });
  },

  endGame: () => {
    const { engine, session, savedSessions } = get();
    const endedEngine = { ...engine, phase: "ended" as GamePhase };
    const endedSession = session
      ? { ...session, endTime: session.endTime ?? Date.now() }
      : null;
    set({
      engine: endedEngine,
      session: endedSession,
      savedSessions: endedSession
        ? [...savedSessions, endedSession]
        : savedSessions,
    });
  },

  setReplayFrame: (frame: number) => {
    set({ replayFrame: frame });
  },

  toggleReplay: () => {
    const { isReplaying } = get();
    set({ isReplaying: !isReplaying });
  },

  setReplaySpeed: (speed: number) => {
    set({ replaySpeed: speed });
  },

  getSnapshotAtFrame: (frame: number) => {
    const { session } = get();
    if (!session) return null;
    if (frame < 0 || frame >= session.snapshots.length) return null;
    return session.snapshots[frame];
  },

  addTreasureMode: () => {
    const { engine, savedSessions } = get();
    const currentSession = get().session;

    const newSettings: GameSettings = { ...engine.settings, withTreasure: true };
    resetOpCounter();
    const newEngine = createInitialState(newSettings);

    set({
      engine: newEngine,
      session: {
        id: `session-${Date.now()}`,
        startTime: Date.now(),
        endTime: null,
        withTreasure: true,
        snapshots: [],
        operations: [],
        calculations: [],
        result: null,
      },
      activeInput: { ...defaultInput },
      replayFrame: 0,
      isReplaying: false,
      savedSessions: currentSession
        ? [...savedSessions, currentSession]
        : savedSessions,
    });
  },
}));
