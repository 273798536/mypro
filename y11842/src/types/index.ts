export interface NodeState {
  id: string;
  name: string;
  syncProgress: number;
  stakeAmount: number;
  isOnline: boolean;
  healthScore: number;
  hasDuplicateStake: boolean;
  consecutiveOfflineRounds: number;
  syncLagRounds: number;
}

export type EventLogType = 'network' | 'penalty' | 'decision' | 'system';
export type EventLogSeverity = 'info' | 'warning' | 'error';

export interface EventLog {
  id: string;
  round: number;
  type: EventLogType;
  message: string;
  severity: EventLogSeverity;
  timestamp: Date;
}

export type PenaltyType = 'offline' | 'sync_violation' | 'duplicate_stake';

export interface Penalty {
  id: string;
  nodeId: string;
  nodeName: string;
  round: number;
  type: PenaltyType;
  amount: number;
  reason: string;
  isMissed: boolean;
}

export type PendingItemType = 'duplicate_stake' | 'sync_lag';

export interface DecisionOptionEffect {
  nodeId?: string;
  syncChange?: number;
  stakeChange?: number;
  onlineChange?: boolean;
  resourceCost: number;
  penaltyRisk?: number;
  createPending?: PendingItemType;
}

export interface Decision {
  id: string;
  round: number;
  optionId: string;
  description: string;
  consequences: DecisionOptionEffect;
}

export interface PendingItem {
  id: string;
  nodeId: string;
  nodeName: string;
  type: PendingItemType;
  description: string;
  roundsPending: number;
  isResolved: boolean;
}

export interface DecisionOption {
  id: string;
  title: string;
  description: string;
  effects: DecisionOptionEffect;
}

export interface NetworkEvent {
  id: string;
  round: number;
  message: string;
  severity: EventLogSeverity;
  affectedNodeId?: string;
  effect?: Partial<NodeState>;
}

export interface ConclusionDiff {
  field: string;
  oldValue: string | number;
  newValue: string | number;
  conclusionChange: string;
  isCritical: boolean;
}

export interface GameState {
  currentRound: number;
  maxRounds: number;
  isPlaying: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  totalScore: number;
  totalPenalties: number;
  resourcePoints: number;
  nodes: NodeState[];
  eventLogs: EventLog[];
  penalties: Penalty[];
  decisions: Decision[];
  pendingItems: PendingItem[];
  currentDecisionOptions: DecisionOption[];
  awaitingDecision: boolean;
  replayMode: boolean;
  replayRound: number;
  supplementData: Record<string, number>;
  conclusionDiffs: ConclusionDiff[];
}
