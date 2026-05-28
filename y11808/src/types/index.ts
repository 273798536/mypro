export enum VerificationStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  VERIFIED = 'verified',
  REVERSED = 'reversed'
}

export enum InvoiceStatus {
  NORMAL = 'normal',
  RED_FLUSHED = 'red_flushed',
  PARTIAL_RED = 'partial_red'
}

export enum WarehouseStatus {
  NORMAL = 'normal',
  SPLIT = 'split',
  RETURNED = 'returned'
}

export enum PenaltyType {
  QUALITY = 'quality',
  DELAY = 'delay',
  OTHER = 'other'
}

export interface PrepaymentFlow {
  id: string;
  supplierId: string;
  supplierName: string;
  contractNo: string;
  prepaymentAmount: number;
  paidDate: string;
  createdBy: string;
  createdAt: string;
  remark?: string;
}

export interface Invoice {
  id: string;
  prepaymentFlowId: string;
  invoiceNo: string;
  invoiceDate: string;
  invoiceAmount: number;
  taxAmount: number;
  status: InvoiceStatus;
  originalInvoiceId?: string;
  redFlushDate?: string;
  createdBy: string;
  createdAt: string;
  remark?: string;
}

export interface WarehouseReceipt {
  id: string;
  prepaymentFlowId: string;
  receiptNo: string;
  receiptDate: string;
  totalAmount: number;
  totalQuantity: number;
  status: WarehouseStatus;
  parentReceiptId?: string;
  createdBy: string;
  createdAt: string;
  remark?: string;
}

export interface WarehouseReceiptItem {
  id: string;
  receiptId: string;
  materialCode: string;
  materialName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface PenaltyRecord {
  id: string;
  prepaymentFlowId: string;
  penaltyType: PenaltyType;
  penaltyAmount: number;
  penaltyDate: string;
  reason: string;
  createdBy: string;
  createdAt: string;
}

export interface VerificationRecord {
  id: string;
  prepaymentFlowId: string;
  invoiceId: string;
  warehouseReceiptId?: string;
  verifiedAmount: number;
  verificationDate: string;
  status: VerificationStatus;
  createdBy: string;
  createdAt: string;
  reversedById?: string;
  reversedAt?: string;
  reverseReason?: string;
}

export interface PrepaymentLedger {
  id: string;
  prepaymentFlowId: string;
  transactionType: 'prepayment' | 'verification' | 'penalty' | 'red_flush' | 'reverse';
  transactionDate: string;
  debitAmount: number;
  creditAmount: number;
  balance: number;
  referenceId: string;
  referenceType: string;
  createdBy: string;
  createdAt: string;
  remark?: string;
}

export interface VerificationSummary {
  prepaymentFlowId: string;
  supplierName: string;
  contractNo: string;
  totalPrepayment: number;
  totalVerified: number;
  totalPenalty: number;
  remainingAmount: number;
  verificationStatus: VerificationStatus;
  invoiceCount: number;
  warehouseReceiptCount: number;
  lastVerificationDate?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  warnings?: string[];
}

export interface VerificationRequest {
  prepaymentFlowId: string;
  invoiceId: string;
  warehouseReceiptId?: string;
  verifiedAmount: number;
  createdBy: string;
  remark?: string;
}

export interface RedFlushRequest {
  invoiceId: string;
  redFlushAmount: number;
  createdBy: string;
  reason: string;
}

export interface WarehouseSplitRequest {
  parentReceiptId: string;
  splitItems: Array<{
    materialCode: string;
    materialName: string;
    quantity: number;
    unitPrice: number;
  }>;
  createdBy: string;
}

export interface PenaltyRequest {
  prepaymentFlowId: string;
  penaltyType: PenaltyType;
  penaltyAmount: number;
  reason: string;
  createdBy: string;
}
