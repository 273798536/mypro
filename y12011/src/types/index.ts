export interface Dealer {
  id: string;
  code: string;
  name: string;
  category: string;
  region: string;
  remarks: string;
  createTime: string;
  updateTime: string;
}

export interface ModificationRecord {
  id: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  reason: string;
  operator: string;
  operateTime: string;
}

export interface SalesOrder {
  id: string;
  dealerId: string;
  dealerName?: string;
  orderNo: string;
  orderDate: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  batchNo: string;
  status: 'normal' | 'returned' | 'corrected';
  modificationHistory: ModificationRecord[];
  missingFields: string[];
}

export interface Payment {
  id: string;
  dealerId: string;
  dealerName?: string;
  paymentNo: string;
  paymentDate: string;
  amount: number;
  bankFlowNo: string;
  status: 'pending' | 'matched' | 'delayed' | 'completed';
  isDelayed: boolean;
  expectedArrivalDate: string;
  matchedOrderNos: string[];
}

export interface AgreementTerms {
  rebateRate: number;
  tieredRates?: {
    minAmount: number;
    maxAmount: number;
    rate: number;
  }[];
  minimumPurchase: number;
  paymentDeadline: number;
  specialConditions: string;
}

export interface AgreementVersion {
  id: string;
  agreementId: string;
  versionNo: number;
  effectiveDate: string;
  terms: AgreementTerms;
  changeReason: string;
  operator: string;
  createTime: string;
}

export interface RebateAgreement {
  id: string;
  dealerId: string;
  dealerName?: string;
  agreementNo: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'active' | 'expired';
  currentVersion: number;
  versions: AgreementVersion[];
}

export interface CalculationDetail {
  id: string;
  orderNo: string;
  orderAmount: number;
  rebateRate: number;
  rebateAmount: number;
  remark: string;
}

export interface DeductionItem {
  id: string;
  type: 'return' | 'writeoff' | 'penalty' | 'other';
  amount: number;
  explanation: string;
  basis: string;
}

export interface CorrectionLog {
  id: string;
  trialVersionId: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  reason: string;
  operator: string;
  operateTime: string;
}

export interface ReviewRecord {
  id: string;
  trialVersionId: string;
  reviewer: string;
  comment: string;
  result: 'approved' | 'rejected' | 'pending';
  reviewTime: string;
}

export interface TrialVersion {
  id: string;
  trialId: string;
  versionNo: number;
  agreementVersionId: string;
  calculationDetails: CalculationDetail[];
  deductions: DeductionItem[];
  baseAmount: number;
  calculatedRebate: number;
  totalDeduction: number;
  finalRebateAmount: number;
  status: 'draft' | 'calculated' | 'adjusted' | 'reviewed';
  createTime: string;
  operator: string;
  correctionLogs: CorrectionLog[];
  reviewHistory: ReviewRecord[];
}

export interface RebateTrial {
  id: string;
  dealerId: string;
  dealerName?: string;
  agreementId: string;
  period: string;
  status: 'draft' | 'calculated' | 'adjusted' | 'reviewed' | 'finalized';
  currentVersion: number;
  versions: TrialVersion[];
  createTime: string;
}

export interface ImpactPreview {
  affectedCount: number;
  amountChange: number;
  affectedOrders: string[];
}

export interface CorrectionSuggestion {
  id: string;
  type: 'payment_writeoff' | 'sales_return' | 'data_clean';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionableSteps: string[];
  affectedOrders: string[];
  impactPreview: ImpactPreview;
  status: 'pending' | 'applied' | 'dismissed';
}

export interface VersionDifference {
  fieldName: string;
  oldValue: string | number;
  newValue: string | number;
  changeType: 'increase' | 'decrease' | 'modified';
  changeAmount?: number;
}

export interface DiffReport {
  trialId: string;
  version1: number;
  version2: number;
  differences: VersionDifference[];
  calculationDiffs: {
    orderNo: string;
    fieldDiffs: VersionDifference[];
  }[];
  deductionDiffs: {
    id: string;
    fieldDiffs: VersionDifference[];
  }[];
  summary: {
    totalChanges: number;
    amountDifference: number;
    affectedOrders: string[];
  };
}

export interface DashboardStats {
  totalDealers: number;
  totalSalesAmount: number;
  pendingTrials: number;
  correctionSuggestions: number;
  dataQualityScore: number;
}

export interface TodoItem {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  status: 'pending' | 'completed';
}
