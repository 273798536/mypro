import { create } from 'zustand';
import type { GamePhase, Position, ConfigDiff, ReplayFrame } from '@/engine/types';
import type { GameState } from '@/engine/gameEngine';
import {
  createGameState, gameTick, assignOrderToRobot,
  computeGrade, diffConfigs
} from '@/engine/gameEngine';
import { defaultScenario, sampleRobotOverrides, sampleShelfOverrides } from '@/config/defaultScenario';

interface GameStore {
  state: GameState;
  speed: number;
  replayFrame: number;
  isReplaying: boolean;

  start: () => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  tick: () => void;
  assignOrder: (orderId: string, robotId: string) => void;
  dismissTimeoutModal: () => void;
  setSpeed: (speed: number) => void;
  setReplayFrame: (frame: number) => void;
  startReplay: () => void;
  stopReplay: () => void;
  getConfigDiffs: () => ConfigDiff[];
  resolveDiff: (index: number, side: 'robot' | 'shelf') => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: createGameState(defaultScenario),
  speed: 1,
  replayFrame: 0,
  isReplaying: false,

  start: () => {
    set({ state: { ...get().state, phase: 'running' } });
  },

  pause: () => {
    const s = get().state;
    if (s.phase === 'running') {
      set({ state: { ...s, phase: 'paused' } });
    }
  },

  resume: () => {
    const s = get().state;
    if (s.phase === 'paused') {
      set({ state: { ...s, phase: 'running' } });
    }
  },

  restart: () => {
    set({
      state: createGameState(defaultScenario),
      replayFrame: 0,
      isReplaying: false,
    });
  },

  tick: () => {
    const s = get().state;
    if (s.phase === 'running') {
      set({ state: gameTick(s) });
    }
  },

  assignOrder: (orderId: string, robotId: string) => {
    const s = get().state;
    if (s.phase !== 'running') return;
    set({ state: assignOrderToRobot(s, orderId, robotId) });
  },

  dismissTimeoutModal: () => {
    const s = get().state;
    set({ state: { ...s, timeoutReasonModal: null } });
  },

  setSpeed: (speed: number) => {
    set({ speed });
  },

  setReplayFrame: (frame: number) => {
    set({ replayFrame: frame });
  },

  startReplay: () => {
    const s = get().state;
    if (s.replayLog.length > 0) {
      set({ isReplaying: true, replayFrame: 0 });
    }
  },

  stopReplay: () => {
    set({ isReplaying: false });
  },

  getConfigDiffs: () => {
    const s = get().state;
    return diffConfigs(sampleRobotOverrides, sampleShelfOverrides, s.map);
  },

  resolveDiff: (index: number, side: 'robot' | 'shelf') => {
    set({});
  },
}));
