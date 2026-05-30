export interface Position {
  id: string;
  borrowAmount: number;
  collateralAmount: number;
  collateralType: string;
  collateralPrice: number;
  liquidationThreshold: number;
  liquidationPrice: number;
  currentRatio: number;
  status: 'safe' | 'warning' | 'danger' | 'liquidated';
  createdAt: number;
}

export interface PricePoint {
  timestamp: number;
  price: number;
  source: string;
  isConfirmed: boolean;
  isJump: boolean;
  jumpBranch?: {
    alternativePrice: number;
    verifier: string;
    status: 'pending' | 'confirmed' | 'rejected';
  };
}

export type ActionType = 'add_collateral' | 'repay' | 'hold' | 'liquidation' | 'price_update';
export type SourceType = 'player' | 'system' | 'oracle' | 'liquidator';

export interface ActionRecord {
  id: string;
  round: number;
  type: ActionType;
  source: SourceType;
  amount?: number;
  timestamp: number;
  explanation: string;
  positionSnapshot: Position;
  priceSnapshot: PricePoint;
  scoreChange: number;
  isRevised: boolean;
  revisedBy?: string;
  revisedAt?: number;
  revisionNote?: string;
}

export interface LiquidationEvent {
  id: string;
  round: number;
  positionId: string;
  triggerPrice: number;
  triggerRatio: number;
  isRepeated: boolean;
  hasGasIssue: boolean;
  verifier: string;
  status: 'pending' | 'executed' | 'cancelled';
  penaltyScore: number;
}

export type GameStatus = 'idle' | 'playing' | 'paused' | 'finished';
export type Difficulty = 'easy' | 'normal' | 'hard';

export interface PenaltyItem {
  id: string;
  round: number;
  type: string;
  description: string;
  score: number;
  linkedActionId: string;
}

export interface GameState {
  gameId: string;
  status: GameStatus;
  currentRound: number;
  totalRounds: number;
  difficulty: Difficulty;
  scenario: string;
  position: Position;
  priceHistory: PricePoint[];
  actionHistory: ActionRecord[];
  liquidationHistory: LiquidationEvent[];
  score: number;
  maxScore: number;
  penalties: PenaltyItem[];
  selectedTraceId: string | null;
  showPriceJumpModal: boolean;
  showRepeatedLiqModal: boolean;
  showGasModal: boolean;
  currentPriceJump: PricePoint | null;
  currentLiquidationEvent: LiquidationEvent | null;
  reviewRound: number;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  totalRounds: number;
  difficulty: Difficulty;
  initialPosition: Omit<Position, 'id' | 'createdAt' | 'currentRatio' | 'status'>;
  priceEvents: PriceEvent[];
}

export interface PriceEvent {
  round: number;
  type: 'normal' | 'jump' | 'crash' | 'pump';
  priceChange: number;
  isMalicious?: boolean;
  verifier?: string;
}

export type ModalType = 'priceJump' | 'repeatedLiq' | 'gas' | null;

export interface TraceIndex {
  positionToResult: Record<string, string>;
  collateralToPosition: Record<string, string>;
  actionToLiquidation: Record<string, string>;
  liquidationToResult: Record<string, string>;
}
