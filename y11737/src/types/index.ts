export interface Bill {
  id: string;
  billNumber: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  applicant: string;
  discountRate: number;
  discountRateVersion: string;
  status: 'pending' | 'approved' | 'rejected' | 'modified';
  source: string;
  createdAt: string;
  updatedAt: string;
  endorsements: Endorsement[];
  calculation: CalculationResult;
  risks: RiskItem[];
  auditLogs: AuditLog[];
}

export interface Endorsement {
  id: string;
  sequence: number;
  endorser: string;
  endorsee: string;
  date: string;
  isBroken?: boolean;
}

export interface CalculationResult {
  discountAmount: number;
  actualAmount: number;
  days: number;
  formula: string;
  version: string;
}

export interface RiskItem {
  type: string;
  level: 'high' | 'medium' | 'low';
  message: string;
  resolved: boolean;
}

export interface AuditLog {
  id: string;
  field: string;
  fieldLabel: string;
  oldValue: string;
  newValue: string;
  operator: string;
  timestamp: string;
  reason: string;
}

export interface DiscountRateConfig {
  version: string;
  effectiveDate: string;
  rate: number;
  isActive: boolean;
}

export interface FilterParams {
  billNumber?: string;
  applicant?: string;
  riskLevel?: string;
  status?: string;
  dueDateStart?: string;
  dueDateEnd?: string;
}

export const RISK_TYPES = {
  BILL_NUMBER_INVALID: 'bill_number_invalid',
  ENDORSEMENT_BROKEN: 'endorsement_broken',
  DUE_DATE_NEAR: 'due_date_near',
  DISCOUNT_RATE_OUTDATED: 'discount_rate_outdated',
  CALCULATION_ABNORMAL: 'calculation_abnormal',
} as const;

export const STATUS_LABELS: Record<Bill['status'], string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  modified: '已修正',
};

export const RISK_LEVEL_LABELS: Record<RiskItem['level'], string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
};
