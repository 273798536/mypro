export type GameStatus = 'idle' | 'playing' | 'paused' | 'settled';

export type AccountStatus = 'normal' | 'warning' | 'danger' | 'liquidated';

export type OperationType = 'add_margin' | 'partial_close' | 'full_close' | 'skip' | 'auto_liquidate';

export type EventType = 'price_rise' | 'price_fall' | 'extreme_rise' | 'extreme_fall' | 'news';

export interface Contract {
  code: string;
  name: string;
  multiplier: number;
  marginRate: number;
  initialPrice: number;
}

export interface Position {
  id: string;
  accountId: string;
  contractCode: string;
  volume: number;
  openPrice: number;
  currentPrice: number;
  direction: 'long' | 'short';
  marginRequired: number;
  unrealizedPnL: number;
}

export interface Account {
  id: string;
  name: string;
  totalCapital: number;
  availableCapital: number;
  marginBalance: number;
  unrealizedPnL: number;
  equity: number;
  riskLevel: number;
  status: AccountStatus;
  positions: Position[];
}

export interface MarketEvent {
  id: string;
  roundNumber: number;
  contractCode: string;
  priceChangePercent: number;
  eventType: EventType;
  description: string;
  isExtreme: boolean;
  timestamp: number;
}

export interface OperationLog {
  id: string;
  roundNumber: number;
  type: OperationType;
  accountId: string;
  accountName: string;
  amount?: number;
  operator: 'player' | 'system';
  reason: string;
  result: 'success' | 'failed';
  scoreChange: number;
  timestamp: number;
}

export interface LiquidationRecord {
  id: string;
  accountId: string;
  accountName: string;
  roundNumber: number;
  reason: string;
  lossAmount: number;
  positionsClosed: Position[];
  timestamp: number;
}

export interface GameState {
  status: GameStatus;
  currentRound: number;
  totalRounds: number;
  timePerRound: number;
  timeRemaining: number;
  accounts: Account[];
  marketEvents: MarketEvent[];
  operationLogs: OperationLog[];
  liquidationRecords: LiquidationRecord[];
  forceCloseQueue: Account[];
  totalScore: number;
  extremeConsecutiveCount: number;
  selectedAccountId: string | null;
  lastExtremeDirection: 'up' | 'down' | null;
}

export type GameAction =
  | { type: 'START_GAME' }
  | { type: 'PAUSE_GAME' }
  | { type: 'RESUME_GAME' }
  | { type: 'RESTART_GAME' }
  | { type: 'SETTLE_GAME' }
  | { type: 'TICK' }
  | { type: 'NEXT_ROUND' }
  | { type: 'SELECT_ACCOUNT'; payload: string | null }
  | { type: 'ADD_MARGIN'; payload: { accountId: string; amount: number } }
  | { type: 'PARTIAL_CLOSE'; payload: { accountId: string; volume: number } }
  | { type: 'FULL_CLOSE'; payload: { accountId: string } }
  | { type: 'SKIP_OPERATION' }
  | { type: 'SYSTEM_AUTO_PROCESS' };

export interface ScoreBreakdown {
  correctOperations: number;
  wrongOperations: number;
  timeouts: number;
  roundsSurvived: number;
  totalScore: number;
  rating: 'S' | 'A' | 'B' | 'C' | 'D';
  accuracy: number;
}

export interface GameConfig {
  TOTAL_ROUNDS: number;
  TIME_PER_ROUND: number;
  INITIAL_ACCOUNTS: number;
  WARNING_THRESHOLD: number;
  DANGER_THRESHOLD: number;
  EXTREME_PRICE_CHANGE: number;
  SCORE_CORRECT_OPERATION: number;
  SCORE_WRONG_OPERATION: number;
  SCORE_TIMEOUT: number;
  SCORE_PER_ROUND_SURVIVE: number;
}
