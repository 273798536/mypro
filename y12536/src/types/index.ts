export type MemberStatus = 'new' | 'active' | 'silent' | 'churned' | 'resurrected';

export type TouchChannel = 'email' | 'sms' | 'push' | 'popup' | 'wechat' | 'phone';

export type TouchType = 'renewal_reminder' | 'exclusive_offer' | 'feedback_request' | 'winback' | 'anniversary';

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
  suggestion?: string;
}

export interface Member {
  id: string;
  name?: string;
  joinDate: string;
  currentStatus: MemberStatus;
  tier: 'basic' | 'premium' | 'vip';
  version: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface StatusHistory {
  memberId: string;
  status: MemberStatus;
  date: string;
  daysInStatus: number;
  source: string;
}

export interface TouchRecord {
  id: string;
  memberId: string;
  channel: TouchChannel;
  type: TouchType;
  timestamp: string;
  strategyId: string;
  version: string;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface RenewalRecord {
  id: string;
  memberId: string;
  amount: number;
  currency: string;
  timestamp: string;
  renewalMonths: number;
  previousExpiry: string;
  newExpiry: string;
  source: string;
  version: string;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  rules: StrategyRule[];
  version: string;
  createdBy: string;
  createdAt: string;
  isActive: boolean;
}

export interface StrategyRule {
  triggerStatus: MemberStatus;
  triggerDays: number;
  channel: TouchChannel;
  type: TouchType;
  priority: number;
  coolDownDays: number;
}

export interface TransitionMatrix {
  states: MemberStatus[];
  matrix: number[][];
  sampleSize: number;
  version: string;
  source: string;
  calculatedAt: string;
  seed: number;
}

export interface PredictionConfig {
  seed: number;
  periods: number;
  initialDistribution: number[];
  strategyId?: string;
  version: string;
  source: string;
}

export interface PredictionResult {
  id: string;
  config: PredictionConfig;
  transitionMatrix: TransitionMatrix;
  periods: MemberStatus[][];
  distributionHistory: number[][];
  churnProbability: number[];
  retentionRate: number[];
  strategyComparison?: StrategyComparisonResult[];
  generatedAt: string;
  version: string;
  source: string;
}

export interface StrategyComparisonResult {
  strategyId: string;
  strategyName: string;
  baselineRetention: number;
  improvedRetention: number;
  liftPercentage: number;
  estimatedLtvGain: number;
  touchCount: number;
  costEstimate: number;
  roi: number;
}

export interface ReportConfig {
  title: string;
  includeCharts: boolean;
  includeRawData: boolean;
  format: 'html' | 'json' | 'pdf';
  version: string;
  source: string;
}

export interface ChurnReport {
  id: string;
  title: string;
  generatedAt: string;
  predictionId: string;
  summary: {
    currentChurnRate: number;
    predictedChurnRate: number;
    bestStrategyId: string;
    expectedRetentionLift: number;
  };
  markovAnalysis: {
    transitionMatrix: TransitionMatrix;
    steadyStateDistribution: number[];
    meanTimeToChurn: number;
  };
  strategyComparison: StrategyComparisonResult[];
  recommendations: string[];
  version: string;
  source: string;
}
