export type ClaimStatus = 'pending' | 'reviewing' | 'approved' | 'rejected' | 'supplement';

export type AnomalyType = 'duplicate_receipt' | 'cross_year' | 'not_recalculated' | 'missing_supplement';

export type SourceType = 'system' | 'manual';

export type SupplementStatus = 'pending' | 'provided' | 'waived';

export type OperationType = 'create' | 'update' | 'calculate' | 'approve' | 'reject';

export interface Policy {
  policyNo: string;
  policyholder: string;
  productName: string;
  coverage: number;
  effectiveDate: string;
  expiryDate: string;
  source: SourceType;
}

export interface Receipt {
  id: string;
  receiptNo: string;
  amount: number;
  issueDate: string;
  source: SourceType;
  isDuplicate?: boolean;
}

export interface Supplement {
  id: string;
  itemName: string;
  status: SupplementStatus;
  remark: string;
  createdAt: string;
}

export interface DeductRule {
  id: string;
  ruleName: string;
  deductibleAmount: number;
  coinsuranceRate: number;
  applicableScope: string;
}

export interface History {
  id: string;
  version: string;
  operator: string;
  operateAt: string;
  operation: OperationType;
  reason: string;
  beforeData: unknown;
  afterData: unknown;
}

export interface Claim {
  id: string;
  policyNo: string;
  claimant: string;
  status: ClaimStatus;
  totalAmount: number;
  deductible: number;
  coinsuranceRate: number;
  payoutAmount: number;
  conclusion: string;
  policy: Policy;
  receipts: Receipt[];
  supplements: Supplement[];
  deductRule: DeductRule;
  anomalies: AnomalyType[];
  needsRecalculate: boolean;
  createdAt: string;
  updatedAt: string;
  history: History[];
}

export const anomalyLabels: Record<AnomalyType, string> = {
  duplicate_receipt: '票据重复',
  cross_year: '跨年度免赔',
  not_recalculated: '需重新计算',
  missing_supplement: '缺少补充材料',
};

export const anomalyColors: Record<AnomalyType, string> = {
  duplicate_receipt: 'bg-red-100 text-red-700 border-red-300',
  cross_year: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  not_recalculated: 'bg-orange-100 text-orange-700 border-orange-300',
  missing_supplement: 'bg-blue-100 text-blue-700 border-blue-300',
};

export const statusLabels: Record<ClaimStatus, string> = {
  pending: '待复核',
  reviewing: '复核中',
  approved: '已通过',
  rejected: '已驳回',
  supplement: '待补料',
};

export const statusColors: Record<ClaimStatus, string> = {
  pending: 'bg-gray-100 text-gray-700',
  reviewing: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  supplement: 'bg-yellow-100 text-yellow-700',
};
