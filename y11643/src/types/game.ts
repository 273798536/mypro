export type GamePhase = 'idle' | 'playing' | 'paused' | 'ended' | 'replaying';

export interface RocketState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  angularVelocity: number;
  fuel: number;
  maxFuel: number;
  thrust: number;
  maxThrust: number;
}

export interface EnvironmentState {
  gravity: number;
  windSpeed: number;
  windDirection: number;
  platformX: number;
  platformY: number;
  platformWidth: number;
  groundY: number;
}

export interface CollisionResult {
  collided: boolean;
  success: boolean;
  impactVelocity: { vx: number; vy: number };
  impactAngle: number;
  onPlatform: boolean;
  failureReason?: string;
}

export interface FlightFrame {
  timestamp: number;
  rocket: RocketState;
  thrustInput: number;
}

export interface FlightSummary {
  maxAltitude: number;
  maxVelocity: number;
  fuelUsed: number;
  flightTime: number;
  landingAccuracy: number;
  impactSpeed: number;
}

export interface FlightRecord {
  id: string;
  startTime: number;
  endTime: number;
  success: boolean;
  score: number;
  failureReason?: string;
  frames: FlightFrame[];
  summary: FlightSummary;
  createdAt: number;
}

export interface GameState {
  phase: GamePhase;
  rocket: RocketState;
  environment: EnvironmentState;
  score: number;
  failureReason?: string;
  flightData: FlightFrame[];
  replaySpeed: number;
  replayFrameIndex: number;
}

export type GameAction =
  | { type: 'START_GAME' }
  | { type: 'PAUSE_GAME' }
  | { type: 'RESUME_GAME' }
  | { type: 'RESET_GAME' }
  | { type: 'SET_THRUST'; payload: number }
  | { type: 'UPDATE'; payload: { dt: number } }
  | { type: 'END_GAME'; payload: { success: boolean; score: number; reason?: string } }
  | { type: 'START_REPLAY'; payload: FlightRecord }
  | { type: 'SET_REPLAY_SPEED'; payload: number }
  | { type: 'SET_REPLAY_FRAME'; payload: number }
  | { type: 'EXIT_REPLAY' };

export const GAME_CONFIG = {
  ROCKET_WIDTH: 30,
  ROCKET_HEIGHT: 80,
  GRAVITY: 9.8,
  MAX_THRUST: 25,
  MAX_FUEL: 100,
  FUEL_CONSUMPTION_RATE: 8,
  PLATFORM_WIDTH: 120,
  SAFE_LANDING_VY: 5,
  SAFE_LANDING_VX: 2,
  SAFE_LANDING_ANGLE: 15,
  WIND_CHANGE_INTERVAL: 3000,
  MAX_WIND_SPEED: 3,
} as const;

export const FAILURE_REASONS = {
  TOO_FAST_VERTICAL: '下降速度过快！硬着陆风险',
  TOO_FAST_HORIZONTAL: '横向速度超标！无法稳定着陆',
  TOO_MUCH_ANGLE: '姿态失控！火箭倾倒',
  OUT_OF_PLATFORM: '偏离着陆平台！任务失败',
  FUEL_EMPTY: '燃料耗尽！失去动力，火箭失控坠落',
  OVER_THRUST: '推力过载！火箭结构承受极限已突破',
} as const;
