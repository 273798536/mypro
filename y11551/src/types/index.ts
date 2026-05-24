export enum SourceType {
  CABINET_INVENTORY = 'cabinet_inventory',
  RESTOCK_PHOTO = 'restock_photo',
  REFUND_RECORD = 'refund_record',
  EXCEPTION_PHOTO = 'exception_photo',
  SMS_SCREENSHOT = 'sms_screenshot'
}

export enum RecordStatus {
  PENDING = 'pending',
  VALID = 'valid',
  INVALID = 'invalid',
  FIXED = 'fixed',
  EXCLUDED = 'excluded'
}

export enum OperationType {
  INIT = 'init',
  IMPORT = 'import',
  CHECK = 'check',
  FIX = 'fix',
  RECALCULATE = 'recalculate',
  EXPORT = 'export'
}

export interface ImportBatch {
  id: string;
  sourceType: SourceType;
  fileName: string;
  filePath: string;
  importTime: string;
  totalRecords: number;
  successCount: number;
  failureCount: number;
  operator: string;
  remark?: string;
}

export interface CabinetInventory {
  id: string;
  batchId: string;
  originalLineNumber: number;
  cabinetId: string;
  cabinetName: string;
  city: string;
  slotId: string;
  slotName: string;
  skuId: string;
  skuName: string;
  stockQuantity: number;
  maxCapacity: number;
  isHotSku: boolean;
  isFull: boolean;
  recordTime: string;
  status: RecordStatus;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RestockPhoto {
  id: string;
  batchId: string;
  originalLineNumber: number;
  cabinetId: string;
  photoPath: string;
  photoTime: string;
  restockQuantity: number;
  operator: string;
  status: RecordStatus;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RefundRecord {
  id: string;
  batchId: string;
  originalLineNumber: number;
  orderId: string;
  cabinetId: string;
  skuId: string;
  refundAmount: number;
  refundTime: string;
  refundReason: string;
  status: RecordStatus;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExceptionPhoto {
  id: string;
  batchId: string;
  originalLineNumber: number;
  cabinetId: string;
  photoPath: string;
  exceptionType: string;
  exceptionTime: string;
  description: string;
  status: RecordStatus;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SmsScreenshot {
  id: string;
  batchId: string;
  originalLineNumber: number;
  cabinetId: string;
  smsContent: string;
  sendTime: string;
  phoneNumber: string;
  status: RecordStatus;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  operationType: OperationType;
  batchId?: string;
  recordId?: string;
  recordType?: string;
  operator: string;
  operationTime: string;
  beforeChange?: string;
  afterChange?: string;
  remark?: string;
}

export interface ReportSummary {
  cabinetId: string;
  cabinetName: string;
  city: string;
  initialStock: number;
  restockQuantity: number;
  salesQuantity: number;
  currentStock: number;
  refundCount: number;
  exceptionCount: number;
  hotSkuFullCount: number;
  lastUpdateTime: string;
}

export interface FailureRecord {
  id: string;
  batchId: string;
  sourceType: SourceType;
  originalLineNumber: number;
  failureReason: string;
  rawData: string;
  createdAt: string;
}
