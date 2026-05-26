export type TemperatureZone = 'frozen' | 'chilled' | 'ambient';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type GameStatus = 'idle' | 'playing' | 'paused' | 'completed' | 'timeout';

export type ImportStrategy = 'skip' | 'overwrite' | 'append';

export type ErrorType = 'zone_mismatch' | 'unload_order' | 'timeout';

export interface CargoBox {
  id: string;
  name: string;
  zone: TemperatureZone;
  weight: number;
  destination: string;
  priority: number;
}

export interface Compartment {
  id: string;
  zone: TemperatureZone;
  row: number;
  col: number;
  occupiedBy: string | null;
}

export interface Station {
  id: string;
  name: string;
  order: number;
}

export interface Level {
  id: string;
  name: string;
  difficulty: Difficulty;
  timeLimit: number;
  cargoBoxes: CargoBox[];
  compartments: Compartment[];
  stations: Station[];
  source: string;
  version: number;
  lastModified: number;
}

export interface GameAction {
  type: 'place' | 'remove' | 'undo' | 'pause' | 'resume' | 'start' | 'submit';
  timestamp: number;
  cargoId?: string;
  compartmentId?: string;
  fromZone?: TemperatureZone;
  toZone?: TemperatureZone;
}

export interface GameError {
  type: ErrorType;
  timestamp: number;
  cargoId: string;
  compartmentId?: string;
  message: string;
}

export interface Deduction {
  type: string;
  amount: number;
  reason: string;
}

export interface ScoreDetail {
  total: number;
  zoneCorrectness: number;
  unloadOrder: number;
  timeBonus: number;
  baseScore: number;
  deductions: Deduction[];
}

export interface GameSession {
  id: string;
  levelId: string;
  startTime: number;
  endTime: number | null;
  pauseDuration: number;
  lastPauseTime: number | null;
  actions: GameAction[];
  score: ScoreDetail | null;
  errors: GameError[];
  status: GameStatus;
  placedCargos: Map<string, string>;
}

export interface ConflictInfo {
  existingId: string;
  incomingId: string;
  field: string;
  existingValue: unknown;
  incomingValue: unknown;
}

export interface ImportResult {
  added: number;
  updated: number;
  skipped: number;
  conflicts: ConflictInfo[];
}

export interface LevelRecord {
  levelId: string;
  bestScore: number;
  bestTime: number;
  completedAt: number;
  attempts: number;
}

export interface ToastMessage {
  id: string;
  type: 'error' | 'warning' | 'success';
  message: string;
  duration?: number;
}

export const ZONE_LABELS: Record<TemperatureZone, string> = {
  frozen: '冷冻',
  chilled: '冷藏',
  ambient: '常温',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

export const ZONE_COLORS: Record<TemperatureZone, string> = {
  frozen: '#6B3FA0',
  chilled: '#2EC4B6',
  ambient: '#FF9F1C',
};
