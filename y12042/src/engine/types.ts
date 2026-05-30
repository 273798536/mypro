export type CellType = 'empty' | 'wire' | 'power' | 'load' | 'fault' | 'short' | 'blocked';
export type CellStatus = 'normal' | 'damaged' | 'repaired' | 'isolated' | 'short_circuited';
export type OperationMode = 'repair' | 'connect' | 'isolate';
export type GameResult = 'win' | 'lose' | null;
export type AnomalyType = 'short_circuit' | 'low_power' | 'path_blocked';
export type DataSource = 'fault_card' | 'power_meter';
export type ErrorType = 'empty' | 'comment' | 'missing_columns' | 'invalid_data';

export interface GridCell {
  id: string;
  x: number;
  y: number;
  type: CellType;
  status: CellStatus;
  voltage: number;
  current: number;
  connections: string[];
  isPowered: boolean;
  shortCircuitLevel: number;
  loadRequirement?: number;
}

export interface OperationRecord {
  timestamp: number;
  type: 'repair' | 'connect' | 'isolate' | 'use_item';
  cellId: string;
  beforeState: Partial<GridCell>;
  afterState: Partial<GridCell>;
  powerSnapshot: number;
}

export interface AnomalyRecord {
  id: string;
  type: AnomalyType;
  timestamp: number;
  cellIds: string[];
  description: string;
  source: 'game' | 'imported';
  isReviewed: boolean;
}

export interface GameState {
  grid: GridCell[][];
  powerNodes: string[];
  loadNodes: string[];
  totalPower: number;
  consumedPower: number;
  timeElapsed: number;
  shortCircuitTimer: number;
  isPaused: boolean;
  isGameOver: boolean;
  gameResult: GameResult;
  operationMode: OperationMode;
  operationLog: OperationRecord[];
  anomalies: AnomalyRecord[];
  repairKits: number;
  selectedCell: string | null;
  levelId: string;
}

export interface BadRow {
  rowIndex: number;
  rawContent: string;
  errorType: ErrorType;
  source: string;
  description: string;
}

export interface ImportResult {
  validRows: any[];
  badRows: BadRow[];
  source: DataSource;
}

export interface ScoreDetail {
  baseScore: number;
  deductions: {
    reason: string;
    amount: number;
    cells: string[];
  }[];
  bonuses: {
    reason: string;
    amount: number;
  }[];
  totalScore: number;
  resourceAllocation: {
    repairKits: { used: number; allocated: number };
    powerUnits: { used: number; allocated: number };
  };
}

export interface LevelConfig {
  id: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  gridSize: { width: number; height: number };
  powerNodes: { x: number; y: number }[];
  loadNodes: { x: number; y: number; requirement: number }[];
  wireCells: { x: number; y: number }[];
  faultCells: { x: number; y: number; severity: 'low' | 'medium' | 'high' }[];
  blockedCells: { x: number; y: number }[];
  totalPower: number;
  repairKits: number;
  shortCircuitInterval: number;
  description: string;
}

export interface PowerNodeState {
  nodeId: string;
  stateHistory: { timestamp: number; voltage: number; status: string }[];
}

export interface CircuitState {
  timestamp: number;
  connectivityMatrix: boolean[][];
  poweredCells: string[];
}

export interface ShortCircuitEvent {
  timestamp: number;
  startCell: string;
  diffusionPath: string[];
}

export interface PowerToScoreChain {
  powerNodeStates: PowerNodeState[];
  circuitStates: CircuitState[];
  shortCircuitEvents: ShortCircuitEvent[];
  operationChain: OperationRecord[];
  anomalyEvents: AnomalyRecord[];
  scoreCalculation: {
    formula: string;
    parameters: Record<string, number>;
    stepResults: number[];
  };
  finalScore: ScoreDetail;
  exportTimestamp: number;
}

export interface ConnectivityResult {
  connected: boolean;
  poweredCells: Set<string>;
  paths: Map<string, string[]>;
}

export interface ShortCircuitResult {
  newShortCells: string[];
  diffusionPath: string[];
  shouldGameOver: boolean;
}
