export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'exception';

export type InvoiceStatus = 'normal' | 'disputed' | 'closed';

export type SplitStatus = 'normal' | 'adjusted' | 'disputed' | 'pending_confirm';

export type ExceptionType = 'multi_invoice' | 'fee_deduct_inner' | 'invoice_dispute' | 'amount_mismatch';

export type ExceptionLevel = 'warning' | 'error' | 'info';

export type DataSourceType = 'payment' | 'invoice' | 'seller' | 'contract' | 'fee' | 'report';

export type ActionType = 'create' | 'update' | 'delete' | 'confirm' | 'dispute' | 'adjust';

export type TargetType = 'payment' | 'split' | 'invoice';

export interface PaymentReceipt {
  id: string;
  receiptNo: string;
  receiptDate: string;
  totalAmount: number;
  payer: string;
  source: string;
  status: PaymentStatus;
  unmatchedAmount?: number;
  remark?: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  sellerId: string;
  sellerName: string;
  invoiceAmount: number;
  remainAmount: number;
  contractNo: string;
  status: InvoiceStatus;
  issueDate: string;
}

export interface SellerAccount {
  id: string;
  sellerName: string;
  accountNo: string;
  bankName: string;
}

export interface FactoringContract {
  id: string;
  contractNo: string;
  sellerId: string;
  factoringRate: number;
  startDate: string;
  endDate: string;
}

export interface FeeConfig {
  id: string;
  name: string;
  rate: number;
  type: 'deduct_inner' | 'deduct_outer';
}

export interface SplitResult {
  id: string;
  paymentId: string;
  invoiceId: string;
  sellerId: string;
  sellerName: string;
  invoiceNo: string;
  splitAmount: number;
  feeAmount: number;
  actualAmount: number;
  status: SplitStatus;
  isDispute: boolean;
  disputeReason?: string;
  remark?: string;
  source: string;
  splitRatio?: number;
}

export interface OperationLog {
  id: string;
  targetId: string;
  targetType: TargetType;
  action: ActionType;
  beforeValue: string;
  afterValue: string;
  operator: string;
  operateTime: string;
}

export interface SplitException {
  id: string;
  paymentId: string;
  type: ExceptionType;
  level: ExceptionLevel;
  message: string;
  resolved: boolean;
  relatedSplitIds?: string[];
}

export interface ImportPreview<T> {
  type: DataSourceType;
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  data: T[];
  errors: { row: number; message: string }[];
}

export interface ReportSummary {
  totalPayments: number;
  totalAmount: number;
  completedCount: number;
  pendingCount: number;
  exceptionCount: number;
  needConfirmCount: number;
  adjustedCount: number;
  disputedCount: number;
}

export interface ReportData {
  summary: ReportSummary;
  unhandledItems: SplitResult[];
  adjustedItems: { split: SplitResult; logs: OperationLog[] }[];
  needConfirmItems: SplitResult[];
  operationLogs: OperationLog[];
}

export interface ImportedData {
  payments: PaymentReceipt[];
  invoices: Invoice[];
  sellers: SellerAccount[];
  contracts: FactoringContract[];
  fees: FeeConfig[];
}
