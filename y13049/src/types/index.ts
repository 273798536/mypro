export type RiskLevel = 'high' | 'medium' | 'low';

export type ProcessingStatus = 
  | 'normal_passed' 
  | 'normal_pending' 
  | 'anomaly_fixed' 
  | 'anomaly_pending' 
  | 'currency_error' 
  | 'withdrawn';

export type RecordSource = 'system' | 'manual' | 'supplement';

export interface ManualNote {
  id: string;
  content: string;
  author: string;
  authorRole: string;
  createdAt: string;
  isWithdrawn: boolean;
  withdrawnAt?: string;
  withdrawnBy?: string;
  linkedConclusionId?: string;
  source: RecordSource;
  history: Array<{
    content: string;
    modifiedAt: string;
    modifiedBy: string;
    modifiedByRole: string;
  }>;
}

export interface HistoricalJudgment {
  id: string;
  judgment: string;
  judger: string;
  judgerRole: string;
  judgedAt: string;
  isFinal: boolean;
  reason: string;
}

export interface AuditTrail {
  id: string;
  field: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
  changedByRole: string;
  changedAt: string;
  reason?: string;
}

export interface RiskRecord {
  id: string;
  bondCode: string;
  bondName: string;
  issuer: string;
  raiseDate: string;
  raiseAmount: number;
  currency: string;
  riskLevel: RiskLevel;
  riskType: string;
  riskDescription: string;
  processingStatus: ProcessingStatus;
  processingResult: string;
  isAnomaly: boolean;
  anomalyReason?: string;
  withdrawalRecord?: {
    withdrawnAt: string;
    withdrawnBy: string;
    withdrawnReason: string;
    linkedConclusionId: string;
  };
  manualNotes: ManualNote[];
  historicalJudgments: HistoricalJudgment[];
  auditTrail: AuditTrail[];
  summaryImpact: string;
  createdAt: string;
  updatedAt: string;
  responsiblePerson: string;
}

export interface FilterConditions {
  riskLevel: RiskLevel | 'all';
  processingStatus: ProcessingStatus | 'all';
  isAnomaly: boolean | 'all';
  hasWithdrawal: boolean | 'all';
  bondCode: string;
  dateRange: {
    start: string;
    end: string;
  };
}

export interface SummaryStats {
  total: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  anomalyCount: number;
  withdrawalCount: number;
  pendingCount: number;
  currencyErrorCount: number;
}

export interface AppState {
  records: RiskRecord[];
  filters: FilterConditions;
  selectedRecordId: string | null;
  reportContent: string;
}
