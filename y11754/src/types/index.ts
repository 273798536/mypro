export interface Point {
  x: number;
  y: number;
}

export type SlopeType = 'positive' | 'negative' | 'zero' | 'undefined';

export type SpecialPointType =
  | 'extremum_max'
  | 'extremum_min'
  | 'non_differentiable'
  | 'discontinuity';

export interface SpecialPoint {
  x: number;
  y: number;
  type: SpecialPointType;
  description: string;
}

export interface MathFunction {
  id: string;
  expression: string;
  displayExpression: string;
  domain: [number, number];
  range: [number, number];
  derivative?: string;
  specialPoints: SpecialPoint[];
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface JudgementPoint {
  id: string;
  x: number;
  y: number;
  type: 'slope' | 'extremum';
  correctAnswer: SlopeType | boolean;
  playerAnswer?: SlopeType | boolean;
  isCorrect?: boolean;
  timestamp?: number;
  errorReason?: string;
  isSpecial?: boolean;
  specialType?: SpecialPointType;
}

export type CorrectionStatus = 'unprocessed' | 'corrected' | 'needs_manual_review';

export interface ErrorRecord {
  id: string;
  levelId: number;
  functionId: string;
  point: Point;
  judgementType: 'slope' | 'extremum';
  playerAnswer: string;
  correctAnswer: string;
  reason: string;
  correctionStatus: CorrectionStatus;
  correctionNote?: string;
  timestamp: number;
  source: string;
  revisionHistory: Array<{
    timestamp: number;
    oldStatus: CorrectionStatus;
    newStatus: CorrectionStatus;
    note?: string;
  }>;
}

export interface GameRecord {
  id: string;
  startTime: number;
  endTime: number;
  totalScore: number;
  levelsCompleted: number;
  totalJudgements: number;
  correctJudgements: number;
  errors: ErrorRecord[];
  functionHistory: string[];
}

export type GameStatus = 'idle' | 'playing' | 'paused' | 'gameOver' | 'levelComplete' | 'allComplete';

export interface GameState {
  currentLevel: number;
  score: number;
  lives: number;
  status: GameStatus;
  currentFunction: MathFunction | null;
  characterPosition: Point;
  judgementPoints: JudgementPoint[];
  currentJudgementIndex: number;
  gameHistory: GameRecord[];
  currentErrors: ErrorRecord[];
  curvePoints: Point[];
  isWaitingForJudgement: boolean;
  feedbackMessage: string | null;
  feedbackType: 'success' | 'error' | 'info' | null;
  currentGameStartTime: number | null;
}

export interface LevelConfig {
  id: number;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  functionIds: string[];
  judgementCount: number;
  description: string;
}

export interface ReportData {
  summary: {
    totalScore: number;
    totalJudgements: number;
    correctJudgements: number;
    accuracy: number;
    levelsCompleted: number;
    totalErrors: number;
    playTime: number;
  };
  errorsByStatus: {
    unprocessed: ErrorRecord[];
    corrected: ErrorRecord[];
    needsManualReview: ErrorRecord[];
  };
  functionStats: Array<{
    functionId: string;
    displayExpression: string;
    totalJudgements: number;
    correctCount: number;
    errors: ErrorRecord[];
  }>;
}
