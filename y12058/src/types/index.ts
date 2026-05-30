export interface Order {
  id: string;
  targetTemperature: number;
  capacity: number;
  timeLimit: number;
  note?: string;
  source: 'customer' | 'stir' | 'manual';
}

export type ActionType = 'heat' | 'ice' | 'stir' | 'pour';

export interface GameAction {
  id: string;
  type: ActionType;
  timestamp: number;
  params: {
    power?: number;
    mass?: number;
    speed?: number;
    duration?: number;
  };
  heatExchange: HeatExchangeResult;
}

export interface TempPoint {
  timestamp: number;
  temperature: number;
  actionId?: string;
}

export interface HeatExchangeResult {
  Q_in: number;
  Q_out: number;
  deltaU: number;
  deltaT: number;
  conservationCheck: boolean;
  errorMargin: number;
  isAbnormal: boolean;
  abnormalType?: 'conservation' | 'temperature_bound' | 'timeout';
}

export interface PhysicsState {
  temperature: number;
  mass: number;
  heatCapacity: number;
  internalEnergy: number;
  temperatureHistory: TempPoint[];
  conservationStatus: 'valid' | 'error' | 'pending';
  conservationError?: number;
}

export interface ExceptionRecord {
  id: string;
  gameId: string;
  actionId: string;
  type: 'temperature_bound' | 'conservation_error' | 'timeout';
  timestamp: number;
  details: {
    temperature?: number;
    expectedRange?: [number, number];
    conservationError?: number;
    elapsedTime?: number;
    timeLimit?: number;
  };
  reviewed: boolean;
}

export type BadRowType = 'empty' | 'comment' | 'missing_column' | 'invalid_format';
export type BadRowSource = 'order' | 'action_log' | 'stir_record';

export interface BadRow {
  id: string;
  originalData: string;
  rowNumber: number;
  type: BadRowType;
  source: BadRowSource;
  note?: string;
}

export interface ScoreDetail {
  actionId: string;
  deduction: number;
  reason: string;
}

export interface Score {
  total: number;
  accuracy: number;
  efficiency: number;
  conservation: number;
  detail: ScoreDetail[];
}

export interface GameState {
  gameId: string;
  currentOrder: Order | null;
  actions: GameAction[];
  startTime: number;
  elapsedTime: number;
  isComplete: boolean;
  score: Score | null;
  badRows: BadRow[];
  exceptions: ExceptionRecord[];
}

export interface ExportReport {
  gameId: string;
  playerName?: string;
  startTime: string;
  endTime: string;
  order: Order;
  actions: (GameAction & {
    temperatureBefore: number;
    temperatureAfter: number;
    scoreImpact: number;
  })[];
  temperatureCurve: TempPoint[];
  score: Score;
  exceptions: ExceptionRecord[];
  badRows: BadRow[];
  dataChainVerification: {
    thermometerConsistent: boolean;
    curveMatchesHistory: boolean;
    scoreUsesCurveData: boolean;
  };
}
