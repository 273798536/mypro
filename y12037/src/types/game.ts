export type ProblemType = 'noise' | 'pop' | 'drift';

export type ToolType = 'removeNoise' | 'fixPop' | 'calibrateBeat';

export type ErrorType = 'wrongTool' | 'missedOriginal' | 'beatDrift' | 'noProblem';

export type GameStatus = 'idle' | 'playing' | 'paused' | 'finished';

export type Severity = 'low' | 'medium' | 'high';

export interface ProblemSpot {
  id: string;
  type: ProblemType;
  position: number;
  track: number;
  severity: Severity;
  isFixed: boolean;
  explanation: string;
}

export interface ActionRecord {
  id: string;
  timestamp: number;
  toolUsed: ToolType;
  targetSpotId?: string;
  isCorrect: boolean;
  scoreChange: number;
  errorType?: ErrorType;
  errorExplanation?: string;
}

export interface GameState {
  status: GameStatus;
  score: number;
  maxScore: number;
  problemSpots: ProblemSpot[];
  actionHistory: ActionRecord[];
  selectedTool: ToolType | null;
  combo: number;
  timeRemaining: number;
  beatPosition: number;
  showFeedback: boolean;
  lastFeedback: {
    type: 'success' | 'error';
    message: string;
    errorType?: ErrorType;
  } | null;
}
