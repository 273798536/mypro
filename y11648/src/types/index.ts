export interface Position {
  x: number;
  y: number;
}

export type TugType = 'harbor' | 'ocean';
export type TugStatus = 'idle' | 'moving' | 'working' | 'refueling';

export interface Tug {
  id: string;
  name: string;
  type: TugType;
  power: number;
  fuelCapacity: number;
  currentFuel: number;
  fuelConsumption: number;
  position: Position;
  targetPosition?: Position;
  status: TugStatus;
  currentTaskId?: string;
}

export type ShipType = 'container' | 'bulk' | 'tanker' | 'passenger';
export type ShipStatus = 'waiting' | 'docking' | 'docked' | 'undocking' | 'departed';

export interface Ship {
  id: string;
  name: string;
  type: ShipType;
  length: number;
  draft: number;
  requiredTugs: number;
  arrivalTime: number;
  departureTime: number;
  status: ShipStatus;
  position: Position;
  targetBerthId?: string;
}

export type BerthStatus = 'available' | 'occupied' | 'reserved';

export interface Berth {
  id: string;
  name: string;
  position: Position;
  maxLength: number;
  minDepth: number;
  status: BerthStatus;
  occupiedBy?: string;
  availableFrom: number;
}

export type TideType = 'high' | 'low';

export interface TideWindow {
  id: string;
  startTime: number;
  endTime: number;
  waterLevel: number;
  type: TideType;
  affectedBerths: string[];
}

export type TaskType = 'dock' | 'undock' | 'move';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface Task {
  id: string;
  type: TaskType;
  shipId: string;
  berthId: string;
  tugIds: string[];
  scheduledTime: number;
  estimatedDuration: number;
  startTime?: number;
  endTime?: number;
  status: TaskStatus;
  conflicts: Conflict[];
}

export type ConflictType = 'tug_collision' | 'tide_missed' | 'fuel_shortage' | 'berth_occupied';
export type ConflictSeverity = 'warning' | 'critical';

export interface Conflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  description: string;
  time: number;
  resolved: boolean;
  resolvedBy?: string;
  resolutionTime?: number;
  taskId?: string;
  tugIds?: string[];
}

export type LogType = 'assignment' | 'movement' | 'conflict' | 'correction' | 'completion' | 'system';

export interface OperationLog {
  id: string;
  timestamp: number;
  gameTime: number;
  type: LogType;
  action: string;
  targetId?: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  isCorrection: boolean;
  correctedLogId?: string;
  source: 'player' | 'system';
}

export interface ScoreBreakdown {
  total: number;
  efficiency: number;
  conflictAvoidance: number;
  fuelManagement: number;
  tideUtilization: number;
  operationNormative: number;
}

export interface DispatchReport {
  gameId: string;
  level: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  score: ScoreBreakdown;
  unhandledEvents: OperationLog[];
  correctedOperations: { original: OperationLog; correction: OperationLog }[];
  needsReview: OperationLog[];
  operationTrail: OperationLog[];
  playDuration: number;
  completedAt: number;
}

export type GameStatus = 'ready' | 'playing' | 'paused' | 'finished';
export type GameSpeed = 1 | 2 | 4;

export interface GameState {
  id: string;
  level: number;
  status: GameStatus;
  speed: GameSpeed;
  currentTime: number;
  startTime: number;
  endTime: number;
  tugs: Tug[];
  ships: Ship[];
  berths: Berth[];
  tideWindows: TideWindow[];
  tasks: Task[];
  logs: OperationLog[];
  activeConflicts: Conflict[];
  selectedTugId?: string;
  selectedShipId?: string;
  isDragging: boolean;
}

export interface LevelData {
  id: number;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  startTime: number;
  endTime: number;
  tugs: Omit<Tug, 'targetPosition' | 'currentTaskId'>[];
  ships: Omit<Ship, 'targetBerthId'>[];
  berths: Omit<Berth, 'occupiedBy'>[];
  tideWindows: TideWindow[];
  tasks: Omit<Task, 'startTime' | 'endTime' | 'conflicts'>[];
}

export interface GameStateSnapshot {
  time: number;
  tugs: Tug[];
  ships: Ship[];
  berths: Berth[];
  tasks: Task[];
  activeConflicts: Conflict[];
}

export interface ReplayData {
  gameId: string;
  level: number;
  levelName: string;
  startTime: number;
  endTime: number;
  snapshots: GameStateSnapshot[];
  logs: OperationLog[];
  finalScore: number;
  completedAt: number;
  playDuration: number;
}

export interface GameRecord {
  id: string;
  level: number;
  levelName: string;
  score: number;
  completedAt: number;
  playDuration: number;
  replayDataId: string;
}
