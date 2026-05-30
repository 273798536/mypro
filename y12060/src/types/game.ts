import { Forklift } from './forklift';
import { Shelf } from './shelf';

export type GameStatus = 'idle' | 'playing' | 'paused' | 'finished';
export type GameMode = 'training' | 'exam' | 'free';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type CollisionType = 'shelf' | 'overheight' | 'blindzone';
export type Severity = 'minor' | 'moderate' | 'severe';
export type ConflictType = 'aisle_width' | 'height_mismatch' | 'blindzone_overlap' | 'load_exceed';
export type RiskLevel = 'warning' | 'danger';
export type CameraView = 'first' | 'third' | 'top';

export interface CollisionRecord {
  id: string;
  sessionId: string;
  type: CollisionType;
  timestamp: number;
  position: { x: number; y: number; z: number };
  speed: number;
  angle: number;
  objectId: string;
  objectName: string;
  severity: Severity;
  screenshot?: string;
  pointsDeducted: number;
}

export interface RoutePoint {
  timestamp: number;
  position: { x: number; y: number; z: number };
  rotation: number;
  speed: number;
  forkHeight: number;
}

export interface DataConflict {
  id: string;
  type: ConflictType;
  forkliftParam: string;
  shelfParam: string;
  forkliftValue: number;
  shelfValue: number;
  description: string;
  riskLevel: RiskLevel;
}

export interface GameScore {
  total: number;
  maxPossible: number;
  timeBonus: number;
  collisionPenalties: number;
  speedPenalties: number;
  blindzonePenalties: number;
  overheightPenalties: number;
}

export interface GameSession {
  id: string;
  mode: GameMode;
  difficulty: Difficulty;
  selectedForklift: Forklift | null;
  selectedShelfConfig: string;
  startTime: number | null;
  endTime: number | null;
  pauseTime: number;
  totalPauseDuration: number;
  score: GameScore;
  violations: CollisionRecord[];
  route: RoutePoint[];
  conflicts: DataConflict[];
  status: GameStatus;
  cameraView: CameraView;
}

export interface LevelConfig {
  id: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  timeLimit: number;
  targetScore: number;
  shelfLayout: string;
  cargoWeight: number;
  requiredTasks: number;
}

export interface Task {
  id: string;
  type: 'pickup' | 'deliver';
  position: { x: number; z: number };
  shelfId: string;
  completed: boolean;
  timestamp?: number;
}
