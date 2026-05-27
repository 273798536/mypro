export type DataSource =
  | 'donation_flow'
  | 'project_tag'
  | 'physical_valuation'
  | 'refund_record'
  | 'invoice_number'
  | 'verification_report';

export const dataSourceLabels: Record<DataSource, string> = {
  donation_flow: '捐赠流水',
  project_tag: '项目标签',
  physical_valuation: '实物估值',
  refund_record: '退款记录',
  invoice_number: '票据号码',
  verification_report: '核销报告',
};

export type ExceptionType =
  | 'physical_value_missing'
  | 'project_mismatch'
  | 'refund_not_reversed'
  | 'data_mismatch'
  | 'duplicate_invoice';

export const exceptionTypeLabels: Record<ExceptionType, string> = {
  physical_value_missing: '实物估值缺失',
  project_mismatch: '项目错挂',
  refund_not_reversed: '退款未冲销',
  data_mismatch: '数据不一致',
  duplicate_invoice: '票据重复',
};

export type InvoiceStatus = 'pending' | 'issued' | 'reversed' | 'exception';

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  pending: '待开票',
  issued: '已开票',
  reversed: '已冲销',
  exception: '异常',
};

export interface Donation {
  id: string;
  donorName: string;
  amount: number;
  projectId: string;
  projectName?: string;
  isPhysical: boolean;
  source: DataSource;
  sourceLine: number;
  invoiceId?: string;
  invoiceNumber?: string;
  invoiceStatus: InvoiceStatus;
  refundId?: string;
  hasRefund: boolean;
  createdAt: string;
  exceptions: ExceptionType[];
  isVerified: boolean;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  isTargeted: boolean;
  category: string;
  totalAmount: number;
  donationCount: number;
}

export interface PhysicalGoods {
  id: string;
  donationId: string;
  goodsName: string;
  quantity: number;
  estimatedValue: number;
  valuationMethod: string;
  valueMissing: boolean;
  source: DataSource;
  sourceLine: number;
}

export interface Refund {
  id: string;
  donationId: string;
  refundAmount: number;
  refundDate: string;
  reason: string;
  invoiceReversed: boolean;
  source: DataSource;
  sourceLine: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  donationId: string;
  status: InvoiceStatus;
  issueDate: string;
  reversed: boolean;
  refundId?: string;
  source: DataSource;
  sourceLine: number;
}

export interface ExceptionRecord {
  id: string;
  type: ExceptionType;
  description: string;
  suggestion: string;
  recordType: 'donation' | 'invoice' | 'refund' | 'physical';
  recordId: string;
  source: DataSource;
  sourceLine: number;
  resolved: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  recordType: string;
  recordId: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  operator: string;
  operatedAt: string;
  source: DataSource;
}

export interface VerificationStats {
  total: number;
  normal: number;
  exception: number;
  pending: number;
  reversed: number;
  totalAmount: number;
  refundAmount: number;
}

export interface ProjectSummary {
  projectId: string;
  projectName: string;
  projectCode: string;
  isTargeted: boolean;
  totalAmount: number;
  donationCount: number;
  physicalCount: number;
  refundCount: number;
}

export type RecordType = 'donation' | 'project' | 'physical' | 'refund' | 'invoice';
