export interface QuadraticParams {
  a: number;
  b: number;
  c: number;
  timestamp: number;
}

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'tree' | 'rock' | 'flag';
}

export interface Skier {
  x: number;
  y: number;
  velocity: number;
  angle: number;
}

export interface CollisionRecord {
  id: string;
  timestamp: number;
  obstacleId: string;
  params: QuadraticParams;
  position: { x: number; y: number };
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  type: 'param_change' | 'curve_confirm' | 'collision' | 'finish' | 'start';
  params?: QuadraticParams;
  description: string;
}

export type GameStatus = 'idle' | 'playing' | 'paused' | 'finished';

export interface ParamWarning {
  id: string;
  param: 'a' | 'b' | 'c';
  value: number;
  message: string;
  needsTeacherReview: boolean;
}

export interface GameState {
  status: GameStatus;
  currentParams: QuadraticParams;
  skier: Skier;
  obstacles: Obstacle[];
  collisions: CollisionRecord[];
  history: HistoryEntry[];
  score: number;
  distance: number;
  paramWarnings: ParamWarning[];
  startTime: number | null;
  endTime: number | null;
}

export interface ReportCard {
  gameId: string;
  startTime: number;
  endTime: number;
  totalScore: number;
  finalParams: QuadraticParams;
  paramChanges: QuadraticParams[];
  collisions: CollisionRecord[];
  history: HistoryEntry[];
  conclusions: {
    paramEffect: string;
    speedAnalysis: string;
    suggestions: string;
    mathSummary: string;
  };
}

export const PARAM_RANGES = {
  a: { min: -5, max: 5, safeMin: -3, safeMax: 3 },
  b: { min: -10, max: 10, safeMin: -8, safeMax: 8 },
  c: { min: -10, max: 10, safeMin: -8, safeMax: 8 },
};

export const CANVAS_CONFIG = {
  width: 800,
  height: 500,
  gridSize: 40,
  startX: 50,
  endX: 750,
};
