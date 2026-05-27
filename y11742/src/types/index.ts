export type DataSource = 'contract' | 'installment' | 'treatment' | 'gift' | 'refund' | 'settlement';

export type DuplicateStrategy = 'ignore' | 'overwrite' | 'append';

export type AnomalyType = 'gift_not_returned' | 'fee_payer_changed' | 'partial_treatment' | 'data_mismatch' | 'unverified_treatment';

export type AnomalySeverity = 'critical' | 'warning' | 'info';

export type FeePayer = 'customer' | 'store' | 'institution' | 'shared';

export type RefundStatus = 'draft' | 'calculating' | 'pending_approval' | 'approved' | 'rejected' | 'completed';

export interface Contract {
  id: string;
  contractNo: string;
  customerName: string;
  customerPhone?: string;
  totalAmount: number;
  treatmentCount: number;
  treatmentNames: string[];
  signDate: string;
  source: string;
  importTime: number;
}

export interface InstallmentBill {
  id: string;
  contractId: string;
  totalAmount: number;
  feeAmount: number;
  feePayer: FeePayer;
  feePayerRatio?: number;
  periods: number;
  paidAmount: number;
  paidPeriods: number;
  source: string;
  importTime: number;
}

export interface TreatmentRecord {
  id: string;
  contractId: string;
  treatmentName: string;
  treatmentDate: string;
  unitPrice: number;
  quantity: number;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedTime?: number;
  source: string;
  importTime: number;
}

export interface Gift {
  id: string;
  contractId: string;
  giftName: string;
  value: number;
  quantity: number;
  isReturned: boolean;
  returnedQuantity?: number;
  returnDate?: string;
  source: string;
  importTime: number;
}

export interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  title: string;
  description: string;
  suggestion: string;
  relatedData?: Record<string, unknown>;
  isResolved: boolean;
  resolvedTime?: number;
  resolvedBy?: string;
  resolutionNote?: string;
  detectedTime: number;
}

export interface RefundCalculation {
  contractTotal: number;
  verifiedTotal: number;
  unverifiedTotal: number;
  treatmentCompletedCount: number;
  treatmentTotalCount: number;
  totalFee: number;
  customerFeeShare: number;
  storeFeeShare: number;
  giftTotalValue: number;
  giftReturnedValue: number;
  giftDeduction: number;
  baseRefund: number;
  feeDeduction: number;
  finalRefund: number;
  paidAmount: number;
  actualRefund: number;
  anomalies: Anomaly[];
}

export interface VersionSnapshot {
  version: string;
  timestamp: number;
  operator: string;
  calculation: RefundCalculation;
  remark: string;
  changes: VersionChange[];
}

export interface VersionChange {
  field: string;
  oldValue: number | string | boolean;
  newValue: number | string | boolean;
}

export interface ApprovalLog {
  id: string;
  refundRequestId: string;
  version: string;
  operator: string;
  operateTime: number;
  action: 'submit' | 'approve' | 'reject' | 'modify' | 'complete';
  remark?: string;
  beforeData?: Partial<RefundCalculation>;
  afterData?: Partial<RefundCalculation>;
}

export interface RefundRequest {
  id: string;
  contractId: string;
  contract?: Contract;
  status: RefundStatus;
  calculation: RefundCalculation;
  currentVersion: string;
  versionHistory: VersionSnapshot[];
  approvalLogs: ApprovalLog[];
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export interface Settlement {
  id: string;
  refundRequestId: string;
  settlementNo: string;
  finalRefund: number;
  settlementDate: string;
  createdBy: string;
  createdAt: number;
}

export interface ImportFileInfo {
  id: string;
  name: string;
  source: DataSource;
  size: number;
  uploadTime: number;
  status: 'pending' | 'processing' | 'success' | 'error';
  recordCount: number;
  errorCount: number;
  duplicateCount: number;
  strategy?: DuplicateStrategy;
  errorMessage?: string;
}

export interface ImportResult<T> {
  success: boolean;
  data: T[];
  errors: string[];
  duplicates: T[];
  strategy: DuplicateStrategy;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface StoreState {
  contracts: Contract[];
  installmentBills: InstallmentBill[];
  treatmentRecords: TreatmentRecord[];
  gifts: Gift[];
  refundRequests: RefundRequest[];
  settlements: Settlement[];
  importFiles: ImportFileInfo[];
  selectedContractId: string | null;
  currentCalculation: RefundCalculation | null;
  anomalies: Anomaly[];
}

export interface StoreActions {
  importData: <T extends { id: string }>(source: DataSource, data: T[], strategy: DuplicateStrategy) => ImportResult<T>;
  selectContract: (contractId: string | null) => void;
  calculateRefund: (contractId: string) => RefundCalculation;
  toggleTreatmentVerification: (treatmentId: string) => void;
  toggleGiftReturn: (giftId: string) => void;
  updateFeePayer: (contractId: string, feePayer: FeePayer, ratio?: number) => void;
  createRefundRequest: (contractId: string) => RefundRequest;
  submitForApproval: (requestId: string, remark?: string) => void;
  approveRefund: (requestId: string, remark?: string) => void;
  rejectRefund: (requestId: string, remark: string) => void;
  completeRefund: (requestId: string) => Settlement;
  resolveAnomaly: (anomalyId: string, note: string) => void;
  exportRefundDocument: (requestId: string, type: 'refund' | 'settlement' | 'approval') => void;
  clearAllData: () => void;
}
