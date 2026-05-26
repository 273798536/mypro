export type ImportMode = 'ignore' | 'overwrite' | 'append';

export type TaskStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed_retry'
  | 'failed_manual'
  | 'failed_permanent';

export type DataSource = 'contract_pdf' | 'payment_node' | 'acceptance_email' | 'refund_record';

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  version: number;
  isDeleted: boolean;
}

export interface Contract extends BaseEntity {
  contractNo: string;
  contractName: string;
  partyA: string;
  partyB: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  currency: string;
  paymentTerms: PaymentTerm[];
  sourceFile: string;
  originalLineNo?: number;
  supplementaryAgreements: SupplementaryAgreement[];
  status: 'active' | 'archived' | 'terminated';
  archivedVersion?: number;
}

export interface PaymentTerm {
  termId: string;
  description: string;
  dueDate: string;
  amount: number;
  milestone?: string;
}

export interface SupplementaryAgreement {
  agreementId: string;
  agreementName: string;
  signedDate: string;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  sourceFile: string;
}

export interface PaymentNode extends BaseEntity {
  contractNo: string;
  nodeId: string;
  nodeName: string;
  plannedDate: string;
  actualDate?: string;
  plannedAmount: number;
  actualAmount?: number;
  status: 'planned' | 'pending' | 'paid' | 'overdue' | 'disputed';
  sourceFile: string;
  originalLineNo?: number;
  batchId: string;
}

export interface AcceptanceRecord extends BaseEntity {
  contractNo: string;
  acceptanceId: string;
  acceptanceDate: string;
  acceptanceResult: 'passed' | 'failed' | 'conditional';
  acceptedAmount: number;
  acceptor: string;
  emailSubject: string;
  emailFrom: string;
  emailDate: string;
  remarks?: string;
  sourceFile: string;
  originalLineNo?: number;
  discrepancies: Discrepancy[];
}

export interface Discrepancy {
  item: string;
  expected: string;
  actual: string;
  difference: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface RefundRecord extends BaseEntity {
  contractNo: string;
  refundId: string;
  refundDate: string;
  refundAmount: number;
  refundReason: string;
  refundMethod: string;
  transactionNo: string;
  status: 'pending' | 'processed' | 'rejected';
  sourceFile: string;
  originalLineNo?: number;
}

export interface StatusChangeLog {
  id: string;
  entityId: string;
  entityType: string;
  field: string;
  oldValue: any;
  newValue: any;
  changedAt: string;
  changedBy: string;
  reason: string;
  batchId?: string;
}

export interface ImportBatch {
  id: string;
  name: string;
  source: DataSource;
  mode: ImportMode;
  fileName: string;
  importedAt: string;
  importedBy: string;
  totalRecords: number;
  successCount: number;
  failedCount: number;
  status: TaskStatus;
  errorMessage?: string;
  retryCount: number;
}

export interface CheckResult {
  id: string;
  batchId: string;
  contractNo: string;
  checkType: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  sourceField?: string;
  expectedValue?: any;
  actualValue?: any;
  originalLineNo?: number;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
  entityType?: 'Contract' | 'PaymentNode' | 'AcceptanceRecord' | 'RefundRecord';
  entityId?: string;
}

export interface FixAction {
  id: string;
  checkResultId: string;
  fixType: string;
  oldValue: any;
  newValue: any;
  appliedAt: string;
  appliedBy: string;
  reason: string;
}

export interface DataStore {
  contracts: Contract[];
  paymentNodes: PaymentNode[];
  acceptanceRecords: AcceptanceRecord[];
  refundRecords: RefundRecord[];
  importBatches: ImportBatch[];
  statusChangeLogs: StatusChangeLog[];
  checkResults: CheckResult[];
  fixActions: FixAction[];
}

export interface CliOptions {
  workspace: string;
  user: string;
  format: 'json' | 'csv' | 'table';
}

export type ExitCode = 
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5;

export const ExitCodes: Record<string, ExitCode> = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  VALIDATION_ERROR: 2,
  IMPORT_ERROR: 3,
  CHECK_ERROR: 4,
  NO_DATA: 5
};
