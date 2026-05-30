export type GamePhase = 'idle' | 'playing' | 'finished';

export type RadarBlockType = 'cloud' | 'rain' | 'storm';

export type DataSource = 'radar-a' | 'radar-b';

export type WarningLevel = 'none' | 'blue' | 'yellow' | 'orange' | 'red';

export type OperationType = 'drag' | 'rotate' | 'warning';

export type ErrorType = 'cloud-mismatch' | 'wind-reverse' | 'warning-early' | 'warning-late';

export type ConflictType = 'radar-wind-mismatch';

export type ErrorSeverity = 'high' | 'medium' | 'low';

export interface Position {
  x: number;
  y: number;
}

export interface RadarBlock {
  id: string;
  type: RadarBlockType;
  position: Position;
  targetPosition: Position;
  isPlaced: boolean;
  isCorrect: boolean | null;
  dataSource: DataSource;
  color: string;
  label: string;
}

export interface OperationRecord {
  id: string;
  timestamp: number;
  type: OperationType;
  detail: Record<string, unknown>;
  triggeredMatch: boolean;
  gameStateSnapshot: {
    radarBlocks: RadarBlock[];
    windDirection: number;
    warningLevel: WarningLevel;
    warningTime: number;
  };
}

export interface ErrorRecord {
  id: string;
  type: ErrorType;
  operationId: string;
  description: string;
  severity: ErrorSeverity;
  deduction: number;
  timestamp: number;
}

export interface ConflictRecord {
  id: string;
  type: ConflictType;
  sourceA: string;
  sourceB: string;
  description: string;
  timestamp: number;
}

export interface MatchResult {
  cloudMatchRate: number;
  windCorrect: boolean;
  warningCorrect: boolean;
  totalScore: number;
  errors: ErrorRecord[];
  conflicts: ConflictRecord[];
}

export interface GameState {
  phase: GamePhase;
  score: number;
  maxScore: number;
  radarBlocks: RadarBlock[];
  windDirection: number;
  targetWindDirection: number;
  warningLevel: WarningLevel;
  warningTime: number;
  targetWarningLevel: WarningLevel;
  targetWarningTime: number;
  operationHistory: OperationRecord[];
  errors: ErrorRecord[];
  conflicts: ConflictRecord[];
  startTime: number | null;
  currentStep: number;
}

export interface GameActions {
  startGame: () => void;
  resetGame: () => void;
  placeRadarBlock: (blockId: string, position: Position) => void;
  setWindDirection: (direction: number) => void;
  setWarning: (level: WarningLevel, time: number) => void;
  submitGame: () => void;
  replayOperation: (stepIndex: number) => void;
}

export type GameStore = GameState & GameActions;

export interface ReportData {
  totalScore: number;
  maxScore: number;
  cloudMatchRate: number;
  windCorrect: boolean;
  warningCorrect: boolean;
  errors: ErrorRecord[];
  conflicts: ConflictRecord[];
  operationCount: number;
  duration: number;
  rainfallCalculation: string;
}
