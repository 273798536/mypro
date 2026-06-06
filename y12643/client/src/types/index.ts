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
  stats?: Record<string, number>;
}

export interface DataSource {
  fileName: string;
  importTime: string;
  importer: string;
  originalId?: string;
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

export interface ExceptionListResponse {
  records: ExceptionRecord[];
  summary: ExportSummary;
  total: number;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  duplicates: number;
  anomalies: number;
  errors: string[];
  duplicateRecords: ExceptionRecord[];
}

export interface CanvasOverview {
  layers: Layer[];
  summary: {
    totalExceptions: number;
    statusCounts: Record<string, number>;
    layerCount: number;
    activeLayers: number;
    warningLayers: number;
    generatedAt: string;
  };
}

export interface ReviewResponse {
  records: ExceptionRecord[];
  layerStats: { recordType: RecordType; stats: Record<string, number> }[];
  batchInfo: {
    generatedAt: string;
    recordTypes: RecordType[];
    totalCount: number;
  };
}

export interface ConsistencyIssue {
  type: 'status_mismatch' | 'history_missing' | 'duplicate_conclusion' | 'export_mismatch';
  recordId: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ConsistencyResult {
  valid: boolean;
  issues: ConsistencyIssue[];
}
