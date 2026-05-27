export interface Planet {
  id: string;
  name: string;
  mass: number;
  radius: number;
  x: number;
  y: number;
  color: string;
  influence: number;
}

export interface TargetOrbit {
  centerX: number;
  centerY: number;
  radius: number;
  tolerance: number;
  requiredSpeedRange: [number, number];
}

export interface Level {
  id: string;
  name: string;
  description: string;
  difficulty: 1 | 2 | 3;
  planets: Planet[];
  target: TargetOrbit;
  start: { x: number; y: number; vx: number; vy: number };
  fuelBudget: number;
  timeLimit: number;
}

export interface Frame {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fuel: number;
  thrust: number;
  angle: number;
  nearestPlanet: string | null;
  altitude: number;
}

export type GameEventType =
  | 'enter-influence'
  | 'leave-influence'
  | 'fuel-low'
  | 'collision'
  | 'escape'
  | 'target-reached';

export interface GameEvent {
  t: number;
  type: GameEventType;
  planet?: string;
  message: string;
}

export type RunResult = 'success' | 'escape' | 'fuel-out' | 'collision' | 'timeout';

export interface ScoreBreakdown {
  base: number;
  fuelBonus: number;
  slingshotBonus: number;
  timeBonus: number;
  penalties: { label: string; value: number }[];
  total: number;
}

export interface RunRecord {
  id: string;
  levelId: string;
  startTime: number;
  endTime: number;
  result: RunResult;
  frames: Frame[];
  events: GameEvent[];
  score: ScoreBreakdown;
  failureReason?: string;
}

export interface GameState {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fuel: number;
  thrust: number;
  angle: number;
  running: boolean;
  paused: boolean;
  ended: boolean;
  result: RunResult | null;
}

export const GAME_CONSTANTS = {
  DT: 1 / 60,
  G: 800,
  ESCAPE_RADIUS: 1800,
  THRUST_ACCEL: 60,
  FUEL_CONSUMPTION: 35,
  LOW_FUEL_THRESHOLD: 0.15,
  SLINGSHOT_SPEED_GAIN: 0.25,
};
