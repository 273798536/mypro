export type Matrix2x2 = [
  [number, number],
  [number, number]
];

export type Vector2 = [number, number];

export type TransformType = 'rotate' | 'scale' | 'shear' | 'identity';

export interface TransformBlock {
  id: string;
  type: TransformType;
  matrix: Matrix2x2;
  name: string;
  description: string;
  params: Record<string, number>;
}

export interface PuzzleCell {
  id: string;
  x: number;
  y: number;
  blockId: string | null;
}

export interface GameState {
  levelId: string;
  grid: PuzzleCell[][];
  availableBlocks: TransformBlock[];
  currentMatrix: Matrix2x2;
  targetMatrix: Matrix2x2;
  steps: StepLog[];
  isComplete: boolean;
  isFailed: boolean;
  errorMessage: string | null;
  startTime: number;
  endTime: number | null;
}

export interface StepLog {
  stepNumber: number;
  timestamp: number;
  action: 'place' | 'remove' | 'swap';
  blockId: string;
  position: { x: number; y: number } | null;
  previousPosition: { x: number; y: number } | null;
  matrixBefore: Matrix2x2;
  matrixAfter: Matrix2x2;
  success: boolean;
  error: string | null;
}

export interface Level {
  id: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  gridSize: { rows: number; cols: number };
  targetMatrix: Matrix2x2;
  availableBlocks: TransformBlock[];
  failurePaths: FailurePath[];
  hint: string;
}

export interface FailurePath {
  id: string;
  description: string;
  pattern: string[];
  explanation: string;
  educationalNote: string;
}

export interface GameResult {
  levelId: string;
  levelName: string;
  isComplete: boolean;
  isFailed: boolean;
  totalSteps: number;
  correctSteps: number;
  duration: number;
  finalMatrix: Matrix2x2;
  targetMatrix: Matrix2x2;
  errorRate: number;
  failureReason: string | null;
  steps: StepLog[];
}

export interface ReviewAnalysis {
  matrixExplanation: string;
  errorFeedback: string;
  humanReadableSummary: string;
  keyInsights: string[];
  commonMistakes: string[];
}
