export interface BondBall {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  faceValue: number;
  couponRate: number;
  maturity: number;
  duration: number;
  remark?: string;
}

export interface RatePaddle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rateChange?: number;
  rateType: 'increase' | 'decrease';
  isFieldMissing: boolean;
}

export interface RateEvent {
  id: string;
  timestamp: number;
  rateBefore: number;
  rateAfter: number;
  rateChange: number;
  isConsecutiveJump: boolean;
  jumpCount: number;
  paddleId: string;
  formula: string;
}

export interface DurationSettlement {
  id: string;
  timestamp: number;
  bondId: string;
  initialDuration: number;
  rateChange: number;
  priceChange: number;
  finalDuration: number;
  isDirectionCorrect: boolean;
  correctionSuggestion?: string;
}

export interface CashflowItem {
  id: string;
  x: number;
  y: number;
  amount: number;
  type: 'coupon' | 'principal';
  isMissed: boolean;
  collected: boolean;
  collectTime?: number;
}

export interface CashflowMiss {
  id: string;
  timestamp: number;
  itemId: string;
  missedAmount: number;
  correctionSteps: string[];
}

export interface GameState {
  currentRate: number;
  totalDuration: number;
  totalCashflow: number;
  score: number;
  level: number;
  isPlaying: boolean;
  isPaused: boolean;
  durationBarDelay: boolean;
  displayDuration: number;
  rateEvents: RateEvent[];
  settlements: DurationSettlement[];
  cashflowMisses: CashflowMiss[];
  consecutiveRateDirection: 'increase' | 'decrease' | null;
  consecutiveRateCount: number;
}

export interface LevelConfig {
  id: number;
  name: string;
  initialRate: number;
  paddles: Omit<RatePaddle, 'id'>[];
  cashflowItems: Omit<CashflowItem, 'id' | 'collected' | 'isMissed'>[];
  durationBarDelayChance: number;
  fieldMissingChance: number;
}
