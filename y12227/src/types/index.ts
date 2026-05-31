export interface CloudBill {
  billId: string;
  accountId: string;
  accountName: string;
  billPeriod: string;
  totalAmount: number;
  itemCount: number;
  status: 'imported' | 'validated' | 'processed';
  importTime: string;
}

export interface BillItem {
  itemId: string;
  billId: string;
  resourceId: string;
  resourceName: string;
  productCode: string;
  productName: string;
  amount: number;
  usageAmount: number;
  usageUnit: string;
  tags: Record<string, string>;
  usageStart: string;
  usageEnd: string;
}

export interface ProjectTag {
  tagId: string;
  projectId: string;
  projectName: string;
  tagKey: string;
  tagValue: string;
  effectiveDate: string;
  expireDate?: string;
}

export type EntryType = 'recharge' | 'consume' | 'refund';

export interface LedgerEntry {
  entryId: string;
  entryType: EntryType;
  amount: number;
  balanceAfter: number;
  sourceType: string;
  sourceId: string;
  sourceDesc: string;
  createdAt: string;
  operator: string;
}

export type ExceptionType = 'missing_tag' | 'cross_project' | 'refund_occupied';
export type ExceptionStatus = 'pending' | 'processing' | 'resolved' | 'ignored';
export type ExceptionSeverity = 'high' | 'medium' | 'low';

export interface ExceptionRecord {
  exceptionId: string;
  exceptionType: ExceptionType;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  relatedBillId?: string;
  relatedItemId?: string;
  relatedResourceId?: string;
  description: string;
  suggestion: string;
  handlerNote?: string;
  createdAt: string;
  handledAt?: string;
  handledBy?: string;
}

export interface AllocationResult {
  projectId: string;
  projectName: string;
  totalAmount: number;
  billPeriod: string;
  items: AllocationItem[];
}

export interface AllocationItem {
  itemId: string;
  resourceId: string;
  resourceName: string;
  amount: number;
  tags: Record<string, string>;
  allocationRule: 'tag_match' | 'manual' | 'proportion';
}

export interface ImportFile {
  fileId: string;
  fileName: string;
  fileType: 'bill' | 'tag' | 'report';
  fileSize: number;
  uploadTime: string;
  status: 'uploading' | 'uploaded' | 'validating' | 'success' | 'failed';
  conflictCount?: number;
  errorMessage?: string;
}

export interface TraceNode {
  id: string;
  type: 'bill' | 'item' | 'allocation' | 'ledger' | 'recharge';
  title: string;
  amount: number;
  date: string;
  children?: TraceNode[];
}

export type TabType = 'all' | 'missing_tag' | 'cross_project' | 'refund_occupied';
