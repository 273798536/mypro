export type SourceType = 'bond' | 'coupon' | 'put' | 'default';

export interface SourceInfo {
  id: string;
  type: SourceType;
  provider: string;
  providedAt: Date;
  rawData: Record<string, unknown>;
}

export interface Bond {
  id: string;
  name: string;
  code: string;
  faceValue: number;
  issueDate: Date;
  maturityDate: Date;
  couponRate: number;
  couponFrequency: number;
  hasPutOption: boolean;
  putDate?: Date;
  sourceId: string;
}

export interface Coupon {
  id: string;
  bondId: string;
  paymentDate: Date;
  amount: number;
  period: number;
  isDeferred: boolean;
  deferredTo?: Date;
  deferralReason?: string;
  isProcessed: boolean;
  sourceId: string;
}

export interface PutOption {
  id: string;
  bondId: string;
  exerciseDate: Date;
  strikePrice: number;
  isExercised: boolean;
  isSelected: boolean;
  sourceId: string;
}

export interface DefaultEvent {
  id: string;
  bondId: string;
  eventDate: Date;
  eventType: 'coupon_miss' | 'principal_miss' | 'bankruptcy' | 'restructuring';
  severity: 'warning' | 'mild' | 'severe';
  description: string;
  isResolved: boolean;
  impactDetails: string[];
  sourceId: string;
  isBackfilled?: boolean;
  backfilledAt?: Date;
}

export type RailwayNodeType = 'bond_start' | 'coupon_station' | 'put_junction' | 'default_trap' | 'destination';
export type NodeStatus = 'pending' | 'active' | 'completed' | 'failed' | 'skipped';

export interface RailwayNode {
  id: string;
  type: RailwayNodeType;
  name: string;
  position: number;
  status: NodeStatus;
  bondId: string;
  couponId?: string;
  putId?: string;
  defaultId?: string;
  processedAt?: Date;
  processedBy?: string;
  error?: GameError;
}

export type ErrorType = 'coupon_deferral_missed' | 'put_option_missed' | 'default_misjudged' | 'coupon_amount_wrong' | 'timing_error';

export interface GameError {
  type: ErrorType;
  message: string;
  triggeredBy: string;
  triggeredAt: Date;
  blockedStep: string;
  nextAction: string;
  nodeId: string;
}

export type GamePhase = 'setup' | 'playing' | 'failed' | 'completed';

export interface SettlementDetail {
  nodeId: string;
  nodeName: string;
  status: NodeStatus;
  amount?: number;
  date?: Date;
  error?: GameError;
}

export interface GameSettlement {
  totalCoupons: number;
  paidCoupons: number;
  deferredCoupons: number;
  putExercised: boolean;
  defaultEvents: number;
  finalAmount: number;
  details: SettlementDetail[];
  errors: GameError[];
  completedAt: Date;
}

export interface LevelConfig {
  id: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  targetBondCount: number;
  hasCouponDeferral: boolean;
  hasPutOption: boolean;
  hasDefaultEvent: boolean;
}

export interface GameState {
  phase: GamePhase;
  currentLevelId: string;
  currentNodeIndex: number;
  bonds: Bond[];
  coupons: Coupon[];
  putOptions: PutOption[];
  defaultEvents: DefaultEvent[];
  sources: SourceInfo[];
  railwayNodes: RailwayNode[];
  errors: GameError[];
  settlement: GameSettlement | null;
  playerName: string;
  selectedBondId: string | null;
}

export interface ImportResult<T> {
  success: boolean;
  data: T[];
  errors: string[];
  sourceId: string;
}
