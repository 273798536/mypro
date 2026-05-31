export type GameStatus = 'idle' | 'playing' | 'paused' | 'settled';

export type OptionType = 'call' | 'put';

export type EventSeverity = 'low' | 'medium' | 'high' | 'critical';

export type EventType = 'volatility_storm' | 'delta_surge' | 'gamma_gate' | 'margin_warning' | 'compound' | 'info_conflict';

export type ConflictResolution = 'main' | 'volatility' | 'delta' | 'reject_all';

export type ShipDirection = 'left' | 'right' | 'center';

export interface DataPoint {
  time: number;
  value: number;
}

export interface OptionPosition {
  type: OptionType;
  strike: number;
  expiry: number;
  underlying: number;
  quantity: number;
  costBasis: number;
  currentValue: number;
}

export interface Greeks {
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  rho: number;
  deltaHistory: DataPoint[];
  gammaHistory: DataPoint[];
  vegaHistory: DataPoint[];
  thetaHistory: DataPoint[];
}

export interface PositionInfo {
  underlyingPrice: number;
  priceChange: number;
  priceDirection: 'up' | 'down';
  confidence: number;
}

export interface VolatilityInfo {
  iv: number;
  ivChange: number;
  severity: EventSeverity;
  expectedDuration: number;
}

export interface DeltaInfo {
  delta: number;
  deltaChange: number;
  gammaIndicator: 'increasing' | 'decreasing' | 'stable';
}

export interface ConflictTrace {
  mainInfoSnapshot: PositionInfo;
  volatilitySnapshot: VolatilityInfo;
  deltaSnapshot: DeltaInfo;
  timestamp: number;
  playerNotes?: string;
}

export interface ConflictEvent {
  id: string;
  timestamp: number;
  mainInfo: PositionInfo;
  volatilityStorm: VolatilityInfo;
  deltaInstrument: DeltaInfo;
  trace: ConflictTrace;
  resolution?: ConflictResolution;
  resolvedAt?: number;
  correctResolution?: ConflictResolution;
}

export interface GameEvent {
  id: string;
  type: EventType;
  timestamp: number;
  actualArrivalTime?: number;
  severity: EventSeverity;
  data: Record<string, number | string>;
  handled: boolean;
  handledAt?: number;
  correctResponse?: string;
  playerResponse?: string;
  isDelayed?: boolean;
  delaySeconds?: number;
}

export interface TimelineItem {
  id: string;
  timestamp: number;
  type: string;
  label: string;
  color: string;
  delayed?: boolean;
  actualArrivalTime?: number;
  description?: string;
}

export interface DeductionItem {
  id: string;
  rule: string;
  points: number;
  reason: string;
  timestamp: number;
  eventId: string;
}

export interface BonusItem {
  id: string;
  rule: string;
  points: number;
  reason: string;
  timestamp: number;
}

export interface Score {
  baseScore: number;
  riskDeductions: DeductionItem[];
  bonuses: BonusItem[];
  total: number;
}

export interface ShipState {
  x: number;
  y: number;
  velocity: number;
  acceleration: number;
  direction: ShipDirection;
  health: number;
}

export interface MarginWarning {
  id: string;
  timestamp: number;
  ratio: number;
  level: 'warning' | 'call' | 'liquidation';
}

export interface MarginState {
  current: number;
  required: number;
  ratio: number;
  warnings: MarginWarning[];
}

export interface CompoundEventData {
  directionMistake: {
    timestamp: number;
    expectedDirection: 'up' | 'down';
    playerDirection: 'up' | 'down';
  };
  marginInsufficient: {
    timestamp: number;
    marginRatio: number;
  };
  volatilityJumps: Array<{
    expectedTimestamp: number;
    actualTimestamp: number;
    volatilityChange: number;
  }>;
}

export interface ReplayFrame {
  time: number;
  ship: ShipState;
  greeks: Greeks;
  position: OptionPosition;
  margin: MarginState;
  events: string[];
}

export interface FlightReport {
  reportId: string;
  createdAt: string;
  totalScore: number;
  gameSummary: {
    duration: number;
    finalPosition: OptionPosition;
    eventsCount: number;
    conflictsCount: number;
  };
  deductions: DeductionItem[];
  bonuses: BonusItem[];
  timeline: TimelineItem[];
  settlementRules: string;
}

export interface GameState {
  status: GameStatus;
  time: number;
  score: Score;
  position: OptionPosition;
  greeks: Greeks;
  events: GameEvent[];
  timeline: TimelineItem[];
  conflicts: ConflictEvent[];
  activeConflict: ConflictEvent | null;
  ship: ShipState;
  margin: MarginState;
  replayData: ReplayFrame[];
  volatility: number;
  riskFreeRate: number;
  pendingGammaUpdates: Array<{ timestamp: number; gamma: number }>;
  lastEventTime: Record<string, number>;
}
