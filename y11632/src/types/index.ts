export interface CashFlow {
  period: number;
  amount: number;
  weight: number;
}

export interface BondCard {
  id: string;
  name: string;
  duration: number;
  couponRate: number;
  maturity: number;
  faceValue: number;
  category: 'short' | 'medium' | 'long';
  cashFlows: CashFlow[];
}

export interface Slot {
  id: string;
  levelId: string;
  minDuration: number;
  maxDuration: number;
  label: string;
}

export interface YieldCurve {
  id: string;
  name: string;
  direction: 'up' | 'down' | 'flat';
  shiftAmount: number;
  points: { term: number; yield: number }[];
}

export interface ErrorScenario {
  id: string;
  type: 'duration_mismatch' | 'curve_direction' | 'cashflow_weight';
  description: string;
  suggestion: string;
}

export interface LearningPoint {
  id: string;
  title: string;
  content: string;
  levelId: string;
}

export interface Operation {
  timestamp: number;
  type: 'drag' | 'curve_adjust' | 'cashflow_estimate';
  detail: Record<string, unknown>;
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
}

export interface ErrorRecord {
  operationIndex: number;
  type: string;
  description: string;
  suggestion: string;
}

export interface GameRecord {
  id: string;
  levelId: string;
  score: number;
  stars: number;
  timeSpent: number;
  operations: Operation[];
  errors: ErrorRecord[];
  createdAt: string;
}

export interface Level {
  id: string;
  name: string;
  description: string;
  bonds: BondCard[];
  slots: Slot[];
  yieldCurve: YieldCurve;
  targetScore: number;
  timeLimit: number;
  learningPoints: LearningPoint[];
}

export type GamePhase = 'start' | 'playing' | 'paused' | 'finished';

export interface PlacedBond {
  bondId: string;
  slotId: string;
  placedAt: number;
}

export interface GameState {
  phase: GamePhase;
  currentLevelId: string | null;
  score: number;
  timeRemaining: number;
  startTime: number;
  placedBonds: PlacedBond[];
  currentCurveDirection: 'up' | 'down' | 'flat';
  cashFlowEstimates: Record<string, number[]>;
  operations: Operation[];
  errors: ErrorRecord[];
  feedback: {
    message: string;
    type: 'success' | 'error' | 'info';
    timestamp: number;
  } | null;
}
