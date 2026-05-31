export type ErrorType = 'out_of_bounds' | 'curve_break' | 'speed_mismatch';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameResult = 'success' | 'failed' | 'playing';

export interface ParameterRange {
  name: string;
  min: number;
  max: number;
  default: number;
  description: string;
}

export interface Obstacle {
  type: ErrorType;
  position: { x: number; y: number };
  radius: number;
  description: string;
}

export interface SuccessCondition {
  type: 'reach_goal' | 'no_errors' | 'time_limit';
  threshold: number;
}

export interface Level {
  id: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  functionType: 'polynomial' | 'trigonometric' | 'piecewise' | 'composite';
  functionExpression: string;
  parameterRanges: ParameterRange[];
  obstacles: Obstacle[];
  successConditions: SuccessCondition[];
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  hint: string;
}

export interface GameError {
  type: ErrorType;
  position: { x: number; y: number };
  message: string;
  severity: 'warning' | 'critical';
  stepIndex: number;
  timestamp: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface GameStep {
  stepIndex: number;
  parameters: Record<string, number>;
  timestamp: number;
  trajectory: Point[];
  errors: GameError[];
  triggered: boolean;
  carPosition: Point;
  speed: number;
}

export interface GameSession {
  id: string;
  levelId: string;
  levelName: string;
  startTime: number;
  endTime: number;
  steps: GameStep[];
  result: GameResult;
  score: number;
  totalErrors: number;
  finalPosition: Point;
}

export interface GameState {
  currentLevel: Level | null;
  currentStep: number;
  steps: GameStep[];
  parameters: Record<string, number>;
  isPlaying: boolean;
  isPaused: boolean;
  carPosition: Point;
  speed: number;
  errors: GameError[];
  trajectory: Point[];
  result: GameResult;
  score: number;
}

export interface ReplayState {
  session: GameSession | null;
  currentStep: number;
  isPlaying: boolean;
  speed: number;
}
