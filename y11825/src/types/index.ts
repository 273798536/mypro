export type OptionType = 'CALL' | 'PUT' | 'STRADDLE' | 'STRANGLE' | 'BUTTERFLY';

export type GameStatus = 'IDLE' | 'PLAYING' | 'PAUSED' | 'SETTLED';

export type ActionType = 'PLACE_TOWER' | 'UPGRADE_TOWER' | 'SELL_TOWER' | 'ADD_MARGIN' | 'FORCE_LIQUIDATION';

export type DetailEventType = 'VOLATILITY_SHOCK' | 'MARGIN_CALL' | 'FORCE_LIQUIDATION' | 'TOWER_ACTION' | 'PENALTY';

export type ChangeType = 'ADDED' | 'REMOVED' | 'MODIFIED';

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export type ImpactScope = 'ALL' | 'SPOT' | 'EXPIRING';

export interface OptionCard {
  id: string;
  name: string;
  type: OptionType;
  strikePrice: number;
  daysToExpiry: number;
  marginRequirement: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  cost: number;
  defensePower: number;
  version: string;
  updatedAt: Date;
  updatedBy: string;
}

export interface VolatilityEvent {
  id: string;
  name: string;
  description: string;
  triggerRound: number;
  volatilityJump: number;
  impactScope: ImpactScope;
  isContinuous: boolean;
  duration: number;
  version: string;
  updatedAt: Date;
  updatedBy: string;
}

export interface Tower {
  id: string;
  optionCardId: string;
  position: { x: number; y: number };
  level: number;
  placedAtRound: number;
  marginUsed: number;
  currentValue: number;
}

export interface GameAction {
  id: string;
  type: ActionType;
  round: number;
  timestamp: number;
  payload: Record<string, any>;
  relatedCardId?: string;
  relatedEventId?: string;
}

export interface GameLevel {
  id: string;
  name: string;
  description: string;
  initialMargin: number;
  initialVolatility: number;
  totalRounds: number;
  difficulty: 'EASY' | 'NORMAL' | 'HARD';
  optionCardIds: string[];
  volatilityEventIds: string[];
}

export interface GameState {
  sessionId: string;
  levelId: string;
  status: GameStatus;
  currentRound: number;
  totalRounds: number;
  currentMargin: number;
  initialMargin: number;
  currentVolatility: number;
  initialVolatility: number;
  lives: number;
  score: number;
  speed: number;
  towers: Tower[];
  availableCards: OptionCard[];
  volatilityEvents: VolatilityEvent[];
  triggeredEvents: string[];
  actionLog: GameAction[];
  spotPrice: number;
}

export interface GameStateSnapshot extends GameState {
  snapshotRound: number;
  snapshotTime: number;
}

export interface SettlementDetail {
  id: string;
  round: number;
  eventType: DetailEventType;
  description: string;
  scoreChange: number;
  relatedCardId?: string;
  relatedEventId?: string;
  humanReadableReason: string;
}

export interface SettlementResult {
  id: string;
  sessionId: string;
  levelId: string;
  finalScore: number;
  grade: Grade;
  roundDetails: SettlementDetail[];
  penaltyDetails: SettlementDetail[];
  towerActions: {
    round: number;
    towerId: string;
    cardName: string;
    action: 'PLACE' | 'UPGRADE' | 'SELL' | 'LIQUIDATED';
    scoreChange: number;
    reason: string;
  }[];
  summary: string;
  createdAt: Date;
  volatilityEventsUsed: VolatilityEvent[];
  optionCardsUsed: OptionCard[];
}

export interface VersionDiff<T> {
  field: keyof T;
  oldValue: any;
  newValue: any;
  changeType: ChangeType;
}

export interface ComparisonResult {
  oldResult: SettlementResult;
  newResult: SettlementResult;
  differences: {
    round: number;
    field: string;
    oldValue: any;
    newValue: any;
    explanation: string;
    relatedEventId?: string;
    relatedCardId?: string;
  }[];
}

export interface ErrorLocation {
  type: 'OPTION_CARD' | 'VOLATILITY_EVENT';
  id: string;
  field: string;
  lineNumber?: number;
  value: any;
  expectedValue?: any;
}

export interface VolatilityJump {
  eventId: string;
  round: number;
  jumpAmount: number;
  cumulativeAfter: number;
  exactCalculation: string;
}

export interface LiquidationItem {
  towerId: string;
  amount: number;
  reason: string;
}

export interface MarginCheckResult {
  adequate: boolean;
  deficit: number;
  relatedCards: string[];
  maintenanceMarginRatio: number;
  currentMargin: number;
  totalMarginUsed: number;
}

export interface ProcessedVolatilityEvent {
  newVolatility: number;
  jumpAmount: number;
  isContinuous: boolean;
  remainingDuration: number;
  exactCalculation: string;
}

export interface CumulativeVolatilityResult {
  volatility: number;
  jumps: VolatilityJump[];
}
