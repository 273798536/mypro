export type ReconciliationStatus =
  | 'pending'
  | 'reviewing'
  | 'passed'
  | 'split_passed'
  | 'rejected'
  | 'supplement_required'
  | 'conflict'
  | 'split_repayment';

export type AppropriatenessCaliber =
  | 'investor_rating'
  | 'product_risk_level'
  | 'investment_term'
  | 'financial_status'
  | 'investment_experience';

export type ReviewConclusion = 'pass' | 'reject' | 'supplement' | 'escalate';

export interface ReconciliationRecord {
  id: string;
  businessNo: string;
  businessDate: string;
  clientName: string;
  clientId: string;
  productName: string;
  productCode: string;
  amount: number;
  currency: string;
  primaryCaliber: AppropriatenessCaliber;
  secondaryCaliber?: AppropriatenessCaliber;
  status: ReconciliationStatus;
  currentConclusion?: ReviewConclusion;
  isDualCaliberConflict: boolean;
  isSplitRepayment: boolean;
  splitParentId?: string;
  boundarySampleTag?: string;
  exceptionQueueId?: string;
  remark?: string;
  operator?: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
}

export interface ExceptionQueueItem {
  id: string;
  reconciliationId: string;
  caliberFilter: AppropriatenessCaliber[];
  reason: string;
  severity: 'high' | 'medium' | 'low';
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  isActive: boolean;
}

export interface HistoryChangeLog {
  id: string;
  reconciliationId: string;
  changedAt: string;
  changedBy: string;
  previousConclusion?: ReviewConclusion;
  newConclusion?: ReviewConclusion;
  previousRemark?: string;
  newRemark?: string;
  previousStatus?: ReconciliationStatus;
  newStatus?: ReconciliationStatus;
  changeReason: string;
  previousSupplementaryMaterials?: string[];
  newSupplementaryMaterials?: string[];
  supplementaryMaterials?: string[];
}

export interface ManagerSummary {
  total: number;
  needSupplementCount: number;
  canReleaseCount: number;
  inConflictCount: number;
  splitRepaymentCount: number;
  needSupplementList: Array<{
    id: string;
    businessNo: string;
    clientName: string;
    productName: string;
    amount: number;
    reason: string;
    remark: string;
  }>;
  canReleaseList: Array<{
    id: string;
    businessNo: string;
    clientName: string;
    productName: string;
    amount: number;
    status?: ReconciliationStatus;
    isSplitRepayment?: boolean;
    conclusion?: ReviewConclusion;
    remark: string;
  }>;
}
