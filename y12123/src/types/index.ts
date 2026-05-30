export type MemberState = 'active' | 'inactive' | 'dormant' | 'churned' | 'recalled';

export const MEMBER_STATE_LABELS: Record<MemberState, string> = {
  active: '活跃',
  inactive: '不活跃',
  dormant: '沉睡',
  churned: '流失',
  recalled: '召回',
};

export const MEMBER_STATE_COLORS: Record<MemberState, string> = {
  active: '#10b981',
  inactive: '#f59e0b',
  dormant: '#f97316',
  churned: '#ef4444',
  recalled: '#3b82f6',
};

export interface MemberBehavior {
  memberId: string;
  memberName?: string;
  timestamp: string;
  state: MemberState;
  remark?: string;
  source?: string;
  isTouch?: boolean;
  value?: number;
  joinDate?: string;
}

export interface Transition {
  from: MemberState;
  to: MemberState;
  count: number;
  probability: number;
}

export interface CalculationConfig {
  states: MemberState[];
  timeWindowDays: number;
  churnThreshold: number;
  coldStartSampleSize: number;
  maxIterations: number;
  weights: {
    probability: number;
    value: number;
    tenure: number;
  };
}

export type AnomalyType = 'missing_field' | 'invalid_transition' | 'duplicate_touch' | 'late_arrival' | 'cold_start';

export interface DataAnomaly {
  type: AnomalyType;
  memberId: string;
  timestamp: string;
  description: string;
  suggestion: string;
  severity: 'low' | 'medium' | 'high';
}

export interface RecallPriorityItem {
  memberId: string;
  memberName?: string;
  churnProbability: number;
  priorityScore: number;
  rank: number;
  currentState: MemberState;
  suggestedAction: string;
  anomalies: DataAnomaly[];
  value?: number;
  tenureDays?: number;
  lastActive?: string;
}

export interface CalculationResult {
  transitionMatrix: Transition[][];
  churnProbabilities: Record<string, number>;
  recallPriorities: RecallPriorityItem[];
  anomalies: DataAnomaly[];
  stateDistribution: Record<MemberState, number>;
  metadata: {
    totalMembers: number;
    validTransitions: number;
    invalidTransitions: number;
    coldStartApplied: boolean;
    calculationTime: number;
    unit: string;
    applicableScope: string;
    failureReasons: string[];
    confidenceLevel: number;
    iterationCount: number;
  };
}

export interface VersionSnapshot {
  id: string;
  name: string;
  createdAt: string;
  config: CalculationConfig;
  result: CalculationResult;
  note?: string;
  modifiedMemberId?: string;
  modifiedFrom?: MemberState;
  modifiedTo?: MemberState;
}

export const DEFAULT_CONFIG: CalculationConfig = {
  states: ['active', 'inactive', 'dormant', 'churned', 'recalled'],
  timeWindowDays: 90,
  churnThreshold: 0.6,
  coldStartSampleSize: 50,
  maxIterations: 100,
  weights: {
    probability: 0.6,
    value: 0.25,
    tenure: 0.15,
  },
};

export const ANOMALY_TYPE_LABELS: Record<AnomalyType, string> = {
  missing_field: '字段缺失',
  invalid_transition: '状态跳转异常',
  duplicate_touch: '触达重复',
  late_arrival: '数据晚到',
  cold_start: '样本冷启动',
};

export const ANOMALY_TYPE_COLORS: Record<AnomalyType, string> = {
  missing_field: '#f59e0b',
  invalid_transition: '#ef4444',
  duplicate_touch: '#8b5cf6',
  late_arrival: '#6366f1',
  cold_start: '#14b8a6',
};
