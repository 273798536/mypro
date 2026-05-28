export type SourceType = 'redemption_application' | 'share_confirmation' | 'quota_threshold' | 'settlement_rule';

export type StepStatus = 'completed' | 'blocked' | 'pending';

export type RedemptionStatus = 'pending' | 'confirmed' | 'partial_confirmed' | 'delayed' | 'settled' | 'reviewing';

export interface RedemptionRequest {
  id: string;
  customerId: string;
  customerName: string;
  fundId: string;
  fundName: string;
  requestAmount: number;
  confirmedAmount: number;
  status: RedemptionStatus;
  queuePosition: number;
  applyDate: string;
  expectedSettlementDate: string;
  actualSettlementDate?: string;
  isDelayed: boolean;
  delayReason?: string;
  source: string;
  needsReview: boolean;
  reviewType?: 'partial' | 'multiple';
}

export interface TraceRecord {
  id: string;
  requestId: string;
  conclusion: string;
  source: string;
  sourceType: SourceType;
  timestamp: string;
}

export interface SettlementStep {
  id: string;
  requestId: string;
  stepName: string;
  stepStatus: StepStatus;
  stepOrder: number;
  blockedReason?: string;
}

export interface StatusLog {
  id: string;
  requestId: string;
  fromStatus: string;
  toStatus: string;
  timestamp: string;
  operator: string;
  reason: string;
}

export interface Fund {
  id: string;
  name: string;
  fundType: string;
  totalQuota: number;
}

export interface QuotaConfig {
  id: string;
  fundId: string;
  dailyRedemptionLimit: number;
  singleRedemptionLimit: number;
}

export interface QueueRuleStep {
  id: string;
  name: string;
  description: string;
  status: 'done' | 'current' | 'next';
}

export interface AppState {
  redemptions: RedemptionRequest[];
  traceRecords: TraceRecord[];
  settlementSteps: SettlementStep[];
  statusLogs: StatusLog[];
  funds: Fund[];
  quotaConfigs: QuotaConfig[];
}

export interface AppActions {
  updateRedemption: (id: string, updates: Partial<RedemptionRequest>, operator: string, reason: string) => void;
  confirmPartialRedemption: (id: string, confirmedAmount: number, operator: string, reason: string) => void;
  approveReview: (id: string, operator: string, reason: string) => void;
  rejectReview: (id: string, operator: string, reason: string) => void;
  resetToSampleData: () => void;
  exportToCSV: () => string;
}
