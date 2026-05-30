import { create } from 'zustand';
import {
  GameState,
  QuadraticParams,
  Obstacle,
  HistoryEntry,
  CollisionRecord,
  ParamWarning,
  PARAM_RANGES,
  CANVAS_CONFIG,
} from '../types/game';

const generateObstacles = (): Obstacle[] => {
  return [
    { id: 'tree-1', x: 200, y: 280, width: 30, height: 50, type: 'tree' },
    { id: 'rock-1', x: 350, y: 320, width: 40, height: 30, type: 'rock' },
    { id: 'tree-2', x: 480, y: 260, width: 30, height: 50, type: 'tree' },
    { id: 'rock-2', x: 600, y: 350, width: 45, height: 35, type: 'rock' },
  ];
};

const validateParamsInternal = (params: QuadraticParams): ParamWarning[] => {
  const warnings: ParamWarning[] = [];
  const paramNames: Record<string, string> = {
    a: '二次项系数',
    b: '一次项系数',
    c: '常数项',
  };

  (['a', 'b', 'c'] as const).forEach((param) => {
    const value = params[param];
    const range = PARAM_RANGES[param];
    
    if (value < range.safeMin || value > range.safeMax) {
      const direction = value < range.safeMin ? '过小' : '过大';
      warnings.push({
        id: `warning-${param}-${Date.now()}`,
        param,
        value,
        message: `${paramNames[param]}${direction}，可能导致曲线${param === 'a' ? '开口异常' : param === 'b' ? '对称轴偏移' : '起始位置异常'}`,
        needsTeacherReview: true,
      });
    }
  });

  return warnings;
};

const getInitialState = (): GameState => ({
  status: 'idle',
  currentParams: { a: 0.002, b: -0.5, c: 0, timestamp: Date.now() },
  skier: { x: CANVAS_CONFIG.startX, y: 250, velocity: 0, angle: 0 },
  obstacles: generateObstacles(),
  collisions: [],
  history: [],
  score: 0,
  distance: 0,
  paramWarnings: [],
  startTime: null,
  endTime: null,
});

interface GameStore extends GameState {
  setParam: (param: 'a' | 'b' | 'c', value: number) => void;
  validateParams: () => ParamWarning[];
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  finishGame: () => void;
  resetGame: () => void;
  updateSkier: (skier: Partial<GameState['skier']>) => void;
  addCollision: (obstacleId: string, position: { x: number; y: number }) => void;
  addHistory: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
  setScore: (score: number) => void;
  setDistance: (distance: number) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...getInitialState(),

  setParam: (param, value) => {
    const clampedValue = Math.max(
      PARAM_RANGES[param].min,
      Math.min(PARAM_RANGES[param].max, value)
    );
    
    const newParams = {
      ...get().currentParams,
      [param]: clampedValue,
      timestamp: Date.now(),
    };
    
    const warnings = validateParamsInternal(newParams);
    
    set({
      currentParams: newParams,
      paramWarnings: warnings,
    });

    get().addHistory({
      type: 'param_change',
      params: newParams,
      description: `调整参数 ${param} = ${clampedValue.toFixed(3)}`,
    });
  },

  validateParams: () => {
    return validateParamsInternal(get().currentParams);
  },

  startGame: () => {
    set((state) => ({
      status: 'playing',
      startTime: Date.now(),
      skier: { ...state.skier, x: CANVAS_CONFIG.startX },
    }));
    
    get().addHistory({
      type: 'start',
      description: '游戏开始',
    });
  },

  pauseGame: () => {
    set({ status: 'paused' });
  },

  resumeGame: () => {
    set({ status: 'playing' });
  },

  finishGame: () => {
    set((state) => ({
      status: 'finished',
      endTime: Date.now(),
    }));
    
    get().addHistory({
      type: 'finish',
      description: `游戏结束，最终得分：${get().score}`,
    });
  },

  resetGame: () => {
    set(getInitialState());
  },

  updateSkier: (skierUpdate) => {
    set((state) => ({
      skier: { ...state.skier, ...skierUpdate },
    }));
  },

  addCollision: (obstacleId, position) => {
    const collision: CollisionRecord = {
      id: `collision-${Date.now()}`,
      timestamp: Date.now(),
      obstacleId,
      params: { ...get().currentParams },
      position,
    };

    set((state) => ({
      collisions: [...state.collisions, collision],
      score: Math.max(0, state.score - 50),
    }));

    get().addHistory({
      type: 'collision',
      params: get().currentParams,
      description: `与障碍物碰撞，扣除50分`,
    });
  },

  addHistory: (entry) => {
    const newEntry: HistoryEntry = {
      ...entry,
      id: `history-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };
    
    set((state) => ({
      history: [...state.history, newEntry],
    }));
  },

  setScore: (score) => {
    set({ score });
  },

  setDistance: (distance) => {
    set({ distance });
  },
}));
