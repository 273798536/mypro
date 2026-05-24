export enum DataSourceType {
  WAVE_ORDER = 'wave_order',
  PICKING_DIFFERENCE = 'picking_difference',
  REVIEW_SCAN = 'review_scan',
  SUPERVISOR_NOTE = 'supervisor_note',
  STOCK_SPLIT = 'stock_split',
}

export enum RetryStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  MANUAL = 'manual',
  CANCELLED = 'cancelled',
  FROZEN = 'frozen',
  DEAD_LETTER = 'dead_letter',
}

export enum IdempotencyStrategy {
  IGNORE = 'ignore',
  OVERWRITE = 'overwrite',
  APPEND = 'append',
}

export enum OperationType {
  SUBMIT = 'submit',
  UPDATE = 'update',
  CANCEL = 'cancel',
  RETRY = 'retry',
  MANUAL_DECISION = 'manual_decision',
  FREEZE = 'freeze',
  UNFREEZE = 'unfreeze',
  EXPORT = 'export',
}

export interface WaveOrderData {
  waveNo: string;
  warehouseCode: string;
  waveType: string;
  pickerId?: string;
  pickerName?: string;
  totalOrders: number;
  totalSkus: number;
  totalQty: number;
  pickedQty?: number;
  status: string;
  waveStartTime?: string;
  waveEndTime?: string;
  performanceData?: Record<string, any>;
  inventoryData?: Record<string, any>;
  extra?: Record<string, any>;
}

export interface PickingDifferenceData {
  differenceNo: string;
  waveNo: string;
  warehouseCode: string;
  orderNo?: string;
  skuCode: string;
  expectedQty: number;
  actualQty: number;
  differenceQty: number;
  differenceType: string;
  differenceReason?: string;
  handlerId?: string;
  handlerName?: string;
  isResolved: boolean;
  resolution?: string;
  extra?: Record<string, any>;
}

export interface ReviewScanData {
  scanNo: string;
  waveNo: string;
  warehouseCode: string;
  orderNo: string;
  skuCode: string;
  scannedQty: number;
  scannerId?: string;
  scannerName?: string;
  scanTime: string;
  isAnomaly: boolean;
  anomalyType?: string;
  extra?: Record<string, any>;
}

export type SourceData = WaveOrderData | PickingDifferenceData | ReviewScanData;

export interface RetryableItem {
  id: string;
  sourceType: DataSourceType;
  sourceId: string;
  sourceData: SourceData;
  status: RetryStatus;
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt?: Date;
  lastAttemptAt?: Date;
  lastError?: string;
  frozenBy?: string;
  frozenAt?: Date;
  frozenReason?: string;
  manualDecisionBy?: string;
  manualDecisionAt?: Date;
  manualDecisionNote?: string;
  idempotencyKey: string;
  idempotencyStrategy: IdempotencyStrategy;
  submittedBy: string;
  submittedAt: Date;
  batchId?: string;
}
