import { create } from 'zustand';
import type {
  GameParams,
  GameState,
  OperationLog,
  GameResult,
  Target,
  MagneticDirection,
  CurrentDirection,
} from '@/types';
import {
  simulateTrajectory,
  calculateScore,
  calculateDeviation,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from '@/physics/trajectory';

interface GameStore {
  gameState: GameState;
  params: GameParams;
  targets: Target[];
  operations: OperationLog[];
  result: GameResult | null;
  replayResult: GameResult | null;
  isReplayMode: boolean;

  setMagneticField: (direction: MagneticDirection, strength: number) => void;
  setCurrent: (direction: CurrentDirection, magnitude: number) => void;
  setMass: (mass: number) => void;
  fire: () => void;
  reset: () => void;
  loadReplay: (result: GameResult) => void;
  exitReplay: () => void;
}

const defaultTargets: Target[] = [
  { x: CANVAS_WIDTH - 100, y: CANVAS_HEIGHT / 2 - 80, radius: 25, points: 100 },
  { x: CANVAS_WIDTH - 100, y: CANVAS_HEIGHT / 2, radius: 35, points: 200 },
  { x: CANVAS_WIDTH - 100, y: CANVAS_HEIGHT / 2 + 80, radius: 25, points: 100 },
];

const defaultParams: GameParams = {
  magneticField: {
    direction: 'up',
    strength: 5,
  },
  current: {
    direction: 'positive',
    magnitude: 30,
  },
  projectile: {
    mass: 10,
    charge: 1,
  },
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: 'idle',
  params: defaultParams,
  targets: defaultTargets,
  operations: [],
  result: null,
  replayResult: null,
  isReplayMode: false,

  setMagneticField: (direction, strength) => {
    const prevValue = { ...get().params.magneticField };
    const newValue = { direction, strength };
    
    const log: OperationLog = {
      id: generateId(),
      type: 'magneticField',
      prevValue,
      newValue,
      timestamp: Date.now(),
      triggeredSimulation: false,
      description: `磁场方向: ${prevValue.direction}→${direction}, 强度: ${prevValue.strength}→${strength}T`,
    };

    set((state) => ({
      params: {
        ...state.params,
        magneticField: newValue,
      },
      operations: [...state.operations, log],
      gameState: 'ready',
    }));
  },

  setCurrent: (direction, magnitude) => {
    const prevValue = { ...get().params.current };
    const newValue = { direction, magnitude };
    
    const log: OperationLog = {
      id: generateId(),
      type: 'current',
      prevValue,
      newValue,
      timestamp: Date.now(),
      triggeredSimulation: false,
      description: `电流方向: ${prevValue.direction}→${direction}, 大小: ${prevValue.magnitude}→${magnitude}A`,
    };

    set((state) => ({
      params: {
        ...state.params,
        current: newValue,
      },
      operations: [...state.operations, log],
      gameState: 'ready',
    }));
  },

  setMass: (mass) => {
    const prevValue = get().params.projectile.mass;
    
    const log: OperationLog = {
      id: generateId(),
      type: 'mass',
      prevValue,
      newValue: mass,
      timestamp: Date.now(),
      triggeredSimulation: true,
      description: `弹丸质量: ${prevValue}→${mass}kg`,
    };

    set((state) => ({
      params: {
        ...state.params,
        projectile: {
          ...state.params.projectile,
          mass,
        },
      },
      operations: [...state.operations, log],
      gameState: 'ready',
    }));
  },

  fire: () => {
    const { params, targets, operations } = get();
    
    const fireLog: OperationLog = {
      id: generateId(),
      type: 'fire',
      prevValue: null,
      newValue: 'fired',
      timestamp: Date.now(),
      triggeredSimulation: true,
      description: '发射弹丸，触发轨迹模拟',
    };

    set({ gameState: 'simulating' });

    const simulation = simulateTrajectory(params, targets);
    const score = calculateScore(simulation.hitTarget, simulation.errors, simulation.maxEnergy);
    const deviation = calculateDeviation(simulation.finalPosition, targets);

    const result: GameResult = {
      hit: !!simulation.hitTarget,
      score,
      deviation,
      hitTarget: simulation.hitTarget || undefined,
      errors: simulation.errors,
      trajectory: simulation.trajectory,
      operations: [...operations, fireLog],
      finalPosition: simulation.finalPosition,
      maxEnergy: simulation.maxEnergy,
    };

    set({
      result,
      gameState: 'finished',
      operations: [...operations, fireLog],
    });
  },

  reset: () => {
    set({
      gameState: 'idle',
      params: defaultParams,
      operations: [],
      result: null,
      isReplayMode: false,
      replayResult: null,
    });
  },

  loadReplay: (result) => {
    set({
      replayResult: result,
      isReplayMode: true,
    });
  },

  exitReplay: () => {
    set({
      replayResult: null,
      isReplayMode: false,
    });
  },
}));
