export enum RecordType {
  BORROW_APPLICATION = 'borrow_application',
  EXPRESS_ORDER = 'express_order',
  COMPENSATION_RECORD = 'compensation_record',
  SHIFT_RECORD = 'shift_record',
}

export enum TaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  WAITING_RETRY = 'waiting_retry',
  WAITING_MANUAL = 'waiting_manual',
  PERMANENT_FAILED = 'permanent_failed',
}

export enum ProcessingReason {
  OVERDUE_FEE_CONFLICT = 'overdue_fee_conflict',
  DAMAGE_FEE_CONFLICT = 'damage_fee_conflict',
  RENEWAL_FEE_OVERLAP = 'renewal_fee_overlap',
  FEE_CALCULATION_ERROR = 'fee_calculation_error',
  DUPLICATE_RECORD = 'duplicate_record',
  NORMAL = 'normal',
}

export interface ImportSource {
  sourceFile: string;
  originalLineNumber: number;
  rawValue: string;
  parsedValue: string;
}

export interface BaseRecord {
  id: string;
  recordType: RecordType;
  businessKey: string;
  createdAt: number;
  updatedAt: number;
  importSource: ImportSource;
  processingReason: ProcessingReason;
  version: number;
  isDeleted: boolean;
}

export interface BorrowApplication extends BaseRecord {
  recordType: RecordType.BORROW_APPLICATION;
  applicationNo: string;
  readerId: string;
  readerName: string;
  isbn: string;
  bookTitle: string;
  applicantLibrary: string;
  lendingLibrary: string;
  applicationDate: number;
  status: string;
  expectedReturnDate: number;
  actualReturnDate?: number;
}

export interface ExpressOrder extends BaseRecord {
  recordType: RecordType.EXPRESS_ORDER;
  expressNo: string;
  relatedApplicationNo: string;
  sender: string;
  receiver: string;
  sendDate: number;
  receiveDate?: number;
  expressCompany: string;
  freight: number;
  status: string;
}

export interface CompensationRecord extends BaseRecord {
  recordType: RecordType.COMPENSATION_RECORD;
  compensationNo: string;
  relatedApplicationNo: string;
  readerId: string;
  compensationType: 'overdue' | 'damage' | 'lost';
  amount: number;
  compensationDate: number;
  status: string;
  remark?: string;
}

export interface ShiftRecord extends BaseRecord {
  recordType: RecordType.SHIFT_RECORD;
  shiftNo: string;
  operatorId: string;
  operatorName: string;
  shiftDate: number;
  shiftType: 'morning' | 'afternoon' | 'night';
  processedRecords: number;
  remark?: string;
}

export type DataRecord = BorrowApplication | ExpressOrder | CompensationRecord | ShiftRecord;

export interface AsyncTask {
  id: string;
  recordId: string;
  recordType: RecordType;
  status: TaskStatus;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
  processedAt?: number;
}

export interface HistoryRecord {
  id: string;
  recordId: string;
  recordType: RecordType;
  operation: 'create' | 'update' | 'delete' | 'import' | 'replay';
  operator: string;
  beforeChange?: Partial<DataRecord>;
  afterChange?: Partial<DataRecord>;
  changeReason: string;
  timestamp: number;
  importSource?: ImportSource;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface QueryParams {
  page?: number;
  pageSize?: number;
  recordType?: RecordType;
  status?: string;
  startDate?: number;
  endDate?: number;
  keyword?: string;
}
