// ===== Domain Types =====

export type SupplierId = string;
export type ContractId = string;
export type InvoiceId = string;
export type ReceiptId = string;
export type PaymentId = string;
export type RuleVersionId = string;
export type OverrideId = string;

export interface SourceRef {
  source: 'contract' | 'invoice' | 'receipt' | 'payment_list' | 'rule_version' | 'override';
  lineNumber: number;
  id: string;
  label: string;
}

export interface RuleVersion {
  id: RuleVersionId;
  supplierId: SupplierId;
  versionLabel: string;
  effectiveDate: string;
  baseDays: number;
  discountDays?: number;
  discountRate?: number;
  contractId: ContractId;
  sourceRef: SourceRef;
  isActive: boolean;
  notes?: string;
}

export interface Contract {
  id: ContractId;
  supplierId: SupplierId;
  supplierName: string;
  contractCode: string;
  startDate: string;
  endDate?: string;
  ruleVersionIds: RuleVersionId[];
  sourceRef: SourceRef;
  isActive: boolean;
}

export interface Invoice {
  id: InvoiceId;
  supplierId: SupplierId;
  contractId: ContractId;
  invoiceCode: string;
  invoiceDate: string;
  amount: number;
  currency: string;
  receiptIds: ReceiptId[];
  sourceRef: SourceRef;
  status: 'pending' | 'matched' | 'disputed' | 'overridden';
}

export interface Receipt {
  id: ReceiptId;
  supplierId: SupplierId;
  contractId: ContractId;
  receiptCode: string;
  receiptDate: string;
  amount: number;
  isPartial: boolean;
  relatedReceiptIds?: ReceiptId[];
  sourceRef: SourceRef;
}

export type PaymentStatus =
  | 'not_due'
  | 'due_soon'
  | 'overdue'
  | 'partially_paid'
  | 'paid'
  | 'disputed'
  | 'void';

export interface PaymentRecord {
  id: PaymentId;
  invoiceId: InvoiceId;
  supplierId: SupplierId;
  contractId: ContractId;
  plannedDate: string;
  actualDate?: string;
  amount: number;
  status: PaymentStatus;
  sourceRef: SourceRef;
}

export interface Override {
  id: OverrideId;
  targetType: 'invoice' | 'payment' | 'rule_version';
  targetId: string;
  reason: string;
  newRuleVersionId?: RuleVersionId;
  newDays?: number;
  operator: string;
  timestamp: string;
  scope: 'single' | 'batch' | 'supplier_all';
  sourceRef: SourceRef;
}

// ===== Analysis Result Types =====

export interface InvoiceAnalysis {
  invoiceId: InvoiceId;
  invoiceCode: string;
  supplierId: SupplierId;
  supplierName: string;
  contractId: ContractId;
  contractCode: string;
  invoiceDate: string;
  amount: number;
  appliedRuleVersionId: RuleVersionId | null;
  appliedRuleVersionLabel: string;
  baseDays: number;
  effectiveDays: number;
  dueDate: string;
  receiptStatus: 'matched' | 'partial' | 'unmatched';
  paymentStatus: PaymentStatus;
  conflictType: ConflictType | null;
  conflictDetail: string | null;
  overrideApplied: boolean;
  overrideReason?: string;
  warnings: WarningInfo[];
  trace: TraceEntry[];
  sourceRef: SourceRef;
}

export type ConflictType =
  | 'contract_switch'
  | 'partial_receipt'
  | 'retroactive_change'
  | 'rule_mismatch'
  | 'payment_delay'
  | 'version_overlap';

export interface WarningInfo {
  level: 'info' | 'warning' | 'error';
  message: string;
  sourceRef: SourceRef;
  relatedTo?: string;
}

export interface TraceEntry {
  timestamp: string;
  action: string;
  detail: string;
  operator: string;
  sourceRef: SourceRef;
}

export interface PaymentStatusMachineState {
  invoiceId: InvoiceId;
  currentStatus: PaymentStatus;
  transitions: PaymentTransition[];
  nextPossibleStates: PaymentStatus[];
}

export interface PaymentTransition {
  from: PaymentStatus;
  to: PaymentStatus;
  triggeredAt: string;
  triggeredBy: string;
  reason: string;
}

export interface AggregatedSupplier {
  supplierId: SupplierId;
  supplierName: string;
  totalInvoices: number;
  totalAmount: number;
  overdueAmount: number;
  disputedAmount: number;
  overriddenCount: number;
  conflictCount: number;
  activeRuleVersionLabel: string;
}

export interface ChartDataPoint {
  period: string;
  normal: number;
  disputed: number;
  overdue: number;
  overridden: number;
}

export interface ProcessingError {
  sourceRef: SourceRef;
  message: string;
  context?: Record<string, unknown>;
}

// ===== App State =====

export interface AppState {
  contracts: Contract[];
  invoices: Invoice[];
  receipts: Receipt[];
  ruleVersions: RuleVersion[];
  payments: PaymentRecord[];
  overrides: Override[];
  analysis: InvoiceAnalysis[];
  aggregated: AggregatedSupplier[];
  chartData: ChartDataPoint[];
  processingErrors: ProcessingError[];
  filters: {
    supplierId: SupplierId | null;
    status: PaymentStatus | null;
    conflictType: ConflictType | null;
    dateRange: [string, string] | null;
  };
  selectedInvoiceId: InvoiceId | null;
}
