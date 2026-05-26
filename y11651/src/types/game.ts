export interface Point {
  x: number;
  y: number;
}

export interface Cell {
  x: number;
  y: number;
  scanned: boolean;
  echoStrength: number;
  hasNoise: boolean;
  noiseLevel: number;
  isTarget: boolean;
  marked: boolean;
}

export interface Submarine {
  id: string;
  position: Point;
  direction: 'up' | 'down' | 'left' | 'right';
  speed: number;
  trajectory: Point[];
  isTurning: boolean;
}

export interface NoiseSource {
  id: string;
  position: Point;
  radius: number;
  intensity: number;
  active: boolean;
}

export interface ScanRecord {
  turn: number;
  position: Point;
  echoStrength: number;
  hasNoise: boolean;
  noiseLevel: number;
  detectedTarget: boolean;
  timestamp: number;
}

export interface PlayerAction {
  type: 'scan' | 'mark' | 'unmark' | 'guess';
  position: Point;
  turn: number;
  timestamp: number;
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'danger' | 'success';
  message: string;
  timestamp: number;
  duration: number;
}

export interface LevelConfig {
  id: number;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  gridSize: number;
  maxTurns: number;
  maxEnergy: number;
  scanCost: number;
  cooldownTime: number;
  submarineSpeed: number;
  turnProbability: number;
  noiseSourceCount: number;
  noiseIntensityRange: [number, number];
  targetScore: number;
}

export interface ReplayRecord {
  id: string;
  levelId: number;
  startTime: number;
  endTime: number;
  finalScore: number;
  result: 'success' | 'failed';
  failReason: string | null;
  actions: PlayerAction[];
  submarineTrajectory: Point[];
  scanHistory: ScanRecord[];
  levelConfig: LevelConfig;
  guessPosition: Point | null;
  actualPosition: Point;
}

export interface GameState {
  status: 'idle' | 'playing' | 'paused' | 'finished' | 'replaying';
  currentLevel: number;
  turn: number;
  maxTurns: number;
  energy: number;
  maxEnergy: number;
  scanCost: number;
  cooldown: number;
  cooldownTime: number;
  grid: Cell[][];
  gridSize: number;
  submarine: Submarine;
  noiseSources: NoiseSource[];
  scanHistory: ScanRecord[];
  playerActions: PlayerAction[];
  guessPosition: Point | null;
  notifications: Notification[];
  score: number;
  result: 'success' | 'failed' | null;
  failReason: string | null;
  startTime: number;
}

export type GameAction =
  | { type: 'INIT_GAME'; payload: { level: LevelConfig } }
  | { type: 'SCAN_CELL'; payload: { position: Point } }
  | { type: 'MARK_CELL'; payload: { position: Point } }
  | { type: 'UNMARK_CELL'; payload: { position: Point } }
  | { type: 'SUBMIT_GUESS'; payload: { position: Point } }
  | { type: 'END_TURN' }
  | { type: 'UPDATE_COOLDOWN'; payload: { value: number } }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: { id: string } }
  | { type: 'FINISH_GAME'; payload: { result: 'success' | 'failed'; reason?: string; score: number } }
  | { type: 'RESET_GAME' };

export interface ScoreResult {
  score: number;
  accuracy: number;
  distance: number;
  distanceScore: number;
  turnEfficiency: number;
  energyBonus: number;
}
