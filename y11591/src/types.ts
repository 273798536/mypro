export type SourceType = 'wave' | 'pick_diff' | 'review_scan' | 'customer_note';

export type RecordStatus = 'pending' | 'valid' | 'invalid' | 'fixed' | 'split';

export type FixType = 'rejudge' | 'split_shortage' | 'manual_correct';

export interface WaveRecord {
  waveNo: string;
  orderNo: string;
  skuCode: string;
  skuName: string;
  planQty: number;
  storeCode: string;
  storeName: string;
  picker?: string;
  area?: string;
}

export interface PickDiffRecord {
  waveNo: string;
  orderNo: string;
  skuCode: string;
  pickQty: number;
  diffQty: number;
  diffType: string;
  diffReason?: string;
  picker?: string;
  pickTime?: string;
}

export interface ReviewScanRecord {
  waveNo: string;
  orderNo: string;
  skuCode: string;
  reviewQty: number;
  reviewer?: string;
  reviewTime?: string;
  isException: boolean;
  exceptionReason?: string;
}

export interface CustomerNoteRecord {
  waveNo: string;
  orderNo: string;
  skuCode?: string;
  noteType: string;
  noteContent: string;
  operator?: string;
  noteTime?: string;
  isUrgent: boolean;
}

export type SourceRecord = WaveRecord | PickDiffRecord | ReviewScanRecord | CustomerNoteRecord;

export interface FactRecord {
  id: string;
  factKey: string;
  sourceType: SourceType;
  waveNo: string;
  orderNo: string;
  skuCode: string;
  data: Record<string, any>;
  status: RecordStatus;
  originalRowNumber: number;
  sourceFile: string;
  importBatchId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationError {
  factId: string;
  factKey: string;
  sourceType: SourceType;
  originalRowNumber: number;
  errorCode: string;
  errorMessage: string;
  field?: string;
  value?: any;
}

export interface FixRecord {
  id: string;
  factId: string;
  factKey: string;
  fixType: FixType;
  oldData: Record<string, any>;
  newData: Record<string, any>;
  operator: string;
  reason: string;
  createdAt: string;
}

export interface ImportBatch {
  id: string;
  sourceType: SourceType;
  fileName: string;
  totalRecords: number;
  successCount: number;
  updateCount: number;
  failCount: number;
  importedAt: string;
  operator?: string;
}

export interface ReportSummary {
  waveNo: string;
  totalOrders: number;
  totalSkus: number;
  planQty: number;
  pickQty: number;
  reviewQty: number;
  diffQty: number;
  exceptionCount: number;
  hasCustomerNote: boolean;
  isValid: boolean;
}

export interface ReportDetail {
  factKey: string;
  sourceType: SourceType;
  originalRowNumber: number;
  status: RecordStatus;
  data: Record<string, any>;
  errors: ValidationError[];
  fixHistory: FixRecord[];
}
