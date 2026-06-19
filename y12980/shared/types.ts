export type RecordStatus = 'AVAILABLE' | 'NEEDS_REVIEW' | 'UNAVAILABLE';
export type AnomalyType = 'SLOW_QUERY_CONFLICT' | 'SCHEMA_CONFLICT' | 'BACKUP_GAP' | 'DUPLICATE_IMPORT' | 'NONE';
export type SourceType = 'SLOW_QUERY_LOG' | 'SCHEMA_SNAPSHOT';
export type MigrationStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
export type BackupStatus = 'VERIFIED' | 'MISSING' | 'CORRUPTED';

export interface LedgerRecord {
  id: string;
  recordNo: string;
  anomalyType: AnomalyType;
  status: RecordStatus;
  sourceFile: string;
  originalLineNo: number;
  sourceType: SourceType;
  importBatchId: string;
  slowQuerySql?: string;
  schemaSnapshot?: string;
  conflictDetails?: string;
  handlingOpinion?: string;
  businessNotes?: string;
  sourceRemark?: string;
  imageName?: string;
  createdAt: string;
  updatedAt: string;
  handledBy?: string;
  handledAt?: string;
}

export interface ImportBatch {
  id: string;
  fileName: string;
  sourceType: SourceType;
  totalRecords: number;
  newRecords: number;
  duplicateRecords: number;
  anomalyCount: number;
  importedAt: string;
  importedBy: string;
}

export interface MigrationTask {
  id: string;
  tableName: string;
  status: MigrationStatus;
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  startedAt?: string;
  completedAt?: string;
}

export interface BackupCheck {
  id: string;
  tableName: string;
  backupDate: string;
  status: BackupStatus;
  expectedRecords: number;
  actualRecords: number;
  gapRecords: number;
  checksum?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GetLedgerParams {
  page?: number;
  pageSize?: number;
  status?: RecordStatus;
  anomalyType?: AnomalyType;
  sourceFile?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateLedgerRequest {
  status?: RecordStatus;
  handlingOpinion?: string;
  businessNotes?: string;
}

export interface ImportResult {
  batchId: string;
  totalRecords: number;
  newRecords: number;
  duplicateRecords: number;
  anomalyCount: number;
  records: LedgerRecord[];
}

export interface MigrationSummary {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  failed: number;
}

export interface BackupSummary {
  totalChecks: number;
  verified: number;
  missing: number;
  corrupted: number;
  totalGapRecords: number;
  completionRate: number;
}

export interface ExportRequest {
  format: 'EXCEL' | 'CSV';
  scope: 'ALL' | 'BY_STATUS' | 'BY_BATCH' | 'BY_DATE';
  status?: RecordStatus;
  batchId?: string;
  startDate?: string;
  endDate?: string;
}

export interface ExportResult {
  exportId: string;
  fileName: string;
  recordCount: number;
  downloadUrl: string;
}

export const STATUS_LABELS: Record<RecordStatus, string> = {
  AVAILABLE: '可用',
  NEEDS_REVIEW: '需DBA复核',
  UNAVAILABLE: '不可用',
};

export const ANOMALY_LABELS: Record<AnomalyType, string> = {
  SLOW_QUERY_CONFLICT: '慢查询冲突',
  SCHEMA_CONFLICT: '表结构冲突',
  BACKUP_GAP: '备份缺口',
  DUPLICATE_IMPORT: '重复导入',
  NONE: '无异常',
};

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  SLOW_QUERY_LOG: '慢查询日志',
  SCHEMA_SNAPSHOT: '表结构快照',
};

export const MIGRATION_STATUS_LABELS: Record<MigrationStatus, string> = {
  PENDING: '待处理',
  IN_PROGRESS: '进行中',
  COMPLETED: '已完成',
  FAILED: '失败',
};

export const BACKUP_STATUS_LABELS: Record<BackupStatus, string> = {
  VERIFIED: '校验通过',
  MISSING: '备份缺失',
  CORRUPTED: '数据损坏',
};
