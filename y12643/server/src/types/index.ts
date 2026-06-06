export enum RecordStatus {
  NORMAL = 'normal',
  PENDING = 'pending',
  ABNORMAL = 'abnormal',
  OFFLINE_MISSING = 'offline_missing',
  PROCESSING = 'processing'
}

export enum RecordType {
  TRAJECTORY = 'trajectory',
  DEVICE_LIST = 'device_list',
  SCALE_ERROR = 'scale_error'
}

export enum ExceptionType {
  SCALE_ERROR = 'scale_error',
  TRAJECTORY_ANOMALY = 'trajectory_anomaly',
  DEVICE_LIST_ERROR = 'device_list_error',
  OFFLINE_MISSING = 'offline_missing',
  DUPLICATE_IMPORT = 'duplicate_import',
  OTHER = 'other'
}

export enum ProcessingAction {
  CONFIRM = 'confirm',
  MODIFY = 'modify',
  REJECT = 'reject',
  SUPPLEMENT = 'supplement',
  REVIEW = 'review'
}

export interface Layer {
  id: string;
  name: string;
  type: RecordType;
  status: 'active' | 'inactive' | 'warning';
  canvasStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExceptionRecord {
  id: string;
  type: ExceptionType;
  recordType: RecordType;
  title: string;
  description: string;
  source: DataSource;
  layerId: string;
  status: RecordStatus;
  color: string;
  data: Record<string, any>;
  offlineMissing: boolean;
  isDuplicate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DataSource {
  fileName: string;
  importTime: string;
  importer: string;
  originalId?: string;
}

export interface ProcessingRecord {
  id: string;
  exceptionId: string;
  action: ProcessingAction;
  operator: string;
  opinion: string;
  timestamp: string;
  previousStatus: RecordStatus;
  newStatus: RecordStatus;
}

export interface AnomalyResult {
  isAnomaly: boolean;
  type?: ExceptionType;
  title?: string;
  details?: string;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  duplicates: number;
  anomalies: number;
  errors: string[];
  duplicateRecords: ExceptionRecord[];
}

export interface FilterCriteria {
  status?: RecordStatus[];
  type?: ExceptionType[];
  recordType?: RecordType[];
  layerId?: string;
  startDate?: string;
  endDate?: string;
  source?: string;
  keyword?: string;
}

export interface ExportSummary {
  totalCount: number;
  statusCounts: Record<RecordStatus, number>;
  typeCounts: Record<ExceptionType, number>;
  recordTypeCounts: Record<RecordType, number>;
  generatedAt: string;
}

export interface ExportData {
  records: ExceptionRecord[];
  summary: ExportSummary;
  processingHistory: ProcessingRecord[];
  metadata: {
    exportedAt: string;
    exporter: string;
    filters: FilterCriteria;
  };
}
