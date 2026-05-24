export type RecordType = 'inspection' | 'calibration' | 'repair';

export type QueueStatus = 
  | 'pending'
  | 'processing'
  | 'retrying'
  | 'manual_intervention'
  | 'dead_letter'
  | 'compensated'
  | 'closed';

export type DirtyType =
  | 'missing_fields'
  | 'cross_day'
  | 'name_changed'
  | 'amount_conflict'
  | 'quantity_conflict'
  | 'none';

export interface InspectionRecord {
  id: string;
  deviceId: string;
  deviceName: string;
  department: string;
  inspectionDate: string;
  inspector: string;
  result: 'pass' | 'fail' | 'pending';
  remarks?: string;
  photos?: string[];
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

export interface CalibrationCertificate {
  id: string;
  deviceId: string;
  deviceName: string;
  certificateNo: string;
  calibrationDate: string;
  validUntil: string;
  calibrationOrg: string;
  status: 'valid' | 'expired' | 'disabled';
  certificateFile?: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

export interface RepairQuote {
  id: string;
  deviceId: string;
  deviceName: string;
  quoteNo: string;
  repairDate: string;
  description: string;
  amount: number;
  quantity: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  serviceRemarks?: string;
  manualOpinion?: string;
  photos?: string[];
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

export interface QueueItem {
  id: string;
  recordType: RecordType;
  recordId: string;
  externalReceiptId?: string;
  status: QueueStatus;
  retryCount: number;
  maxRetries: number;
  dirtyType: DirtyType;
  dirtyDetails: string;
  rawData: string;
  errorMessage?: string;
  assignee?: string;
  processedAt?: string;
  nextRetryAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiffLog {
  id: string;
  queueId: string;
  recordType: RecordType;
  recordId: string;
  action: string;
  beforeData: string;
  afterData: string;
  operator: string;
  remarks?: string;
  createdAt: string;
}

export type UnifiedRecord = {
  id: string;
  queueId: string;
  recordType: RecordType;
  deviceId: string;
  deviceName: string;
  department: string;
  date: string;
  status: string;
  source: string;
  details: string;
  photos?: string[];
  linkedIds: string[];
  createdAt: string;
  updatedAt: string;
};
