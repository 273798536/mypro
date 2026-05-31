export type RiskLevel = 'low' | 'medium' | 'high' | 'extreme';
export type PenaltyType = 'offline' | 'duplicate' | 'unlock_misclick';
export type OperationType = 'stake' | 'unlock' | 'round_advance' | 'penalty' | 'reward' | 'game_start' | 'game_end';

export interface ValidatorNode {
  id: string;
  name: string;
  avatar: string;
  uptime: number;
  yieldRate: number;
  penaltyCoefficient: number;
  riskLevel: RiskLevel;
  isOnline: boolean;
  description: string;
}

export interface StakeRecord {
  id: string;
  nodeId: string;
  amount: number;
  timestamp: number;
  round: number;
  isDuplicate: boolean;
  isUnlocked: boolean;
}

export interface UnlockRecord {
  id: string;
  stakeId: string;
  nodeId: string;
  amount: number;
  requestRound: number;
  actualUnlockRound: number;
  isMisclick: boolean;
  penaltyAmount: number;
  expectedReward: number;
}

export interface PenaltyEvent {
  id: string;
  type: PenaltyType;
  nodeId?: string;
  nodeName?: string;
  round: number;
  amount: number;
  reason: string;
  suggestion: string;
  details: string[];
  timestamp: number;
}

export interface RewardEvent {
  id: string;
  nodeId: string;
  nodeName: string;
  round: number;
  amount: number;
  yieldRate: number;
  timestamp: number;
}

export interface OperationLog {
  id: string;
  round: number;
  type: OperationType;
  description: string;
  stateSnapshot: Partial<GameState>;
  timestamp: number;
}

export interface GameState {
  currentRound: number;
  maxRounds: number;
  totalBalance: number;
  initialBalance: number;
  stakeRecords: StakeRecord[];
  unlockRecords: UnlockRecord[];
  penaltyEvents: PenaltyEvent[];
  rewardEvents: RewardEvent[];
  rewardPool: number;
  totalPenalty: number;
  totalReward: number;
  selectedNodeId: string | null;
  nodes: ValidatorNode[];
  isGameOver: boolean;
  isGameStarted: boolean;
  operationLog: OperationLog[];
  pendingPenalty: PenaltyEvent | null;
}

export interface PenaltyResult {
  amount: number;
  reason: string;
  suggestion: string;
  details: string[];
}

export interface RoundResult {
  rewards: RewardEvent[];
  penalties: PenaltyEvent[];
  nodeUpdates: Partial<ValidatorNode>[];
}
