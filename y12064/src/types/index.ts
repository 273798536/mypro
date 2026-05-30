export type MagneticDirection = 'up' | 'down' | 'left' | 'right';
export type CurrentDirection = 'positive' | 'negative';

export interface Vector2D {
  x: number;
  y: number;
}

export interface GameParams {
  magneticField: {
    direction: MagneticDirection;
    strength: number;
  };
  current: {
    direction: CurrentDirection;
    magnitude: number;
  };
  projectile: {
    mass: number;
    charge: number;
  };
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  velocity: Vector2D;
  force: Vector2D;
  timestamp: number;
  energy: number;
}

export type OperationType = 'magneticField' | 'current' | 'mass' | 'fire';

export interface OperationLog {
  id: string;
  type: OperationType;
  prevValue: unknown;
  newValue: unknown;
  timestamp: number;
  triggeredSimulation: boolean;
  description: string;
}

export type ErrorType = 'direction' | 'energy' | 'mass' | 'parameter';
export type ErrorSeverity = 'warning' | 'error' | 'pending';

export interface GameError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  nextStep: string;
  physicsFormula?: string;
}

export interface Target {
  x: number;
  y: number;
  radius: number;
  points: number;
}

export interface GameResult {
  hit: boolean;
  score: number;
  deviation: number;
  hitTarget?: Target;
  errors: GameError[];
  trajectory: TrajectoryPoint[];
  operations: OperationLog[];
  finalPosition: Vector2D;
  maxEnergy: number;
}

export type GameState = 'idle' | 'ready' | 'firing' | 'simulating' | 'finished';

export interface ReplayState {
  isReplaying: boolean;
  currentStep: number;
  speed: number;
}
