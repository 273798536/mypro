export type ArchiveStatus = 'success' | 'pending' | 'error';
export type AnomalyType = 'backup_gap' | 'page_sequence' | 'slow_query' | 'none';
export type DataSourceType = 'full_backup' | 'incremental_backup' | 'binlog' | 'manual';
export type ImpactLevel = 'high' | 'medium' | 'low';
export type ExportFormat = 'csv' | 'json';

export interface ArchiveRecord {
  id: string;
  batchNumber: string;
  runTimestamp: string;
  tableName: string;
  status: ArchiveStatus;
  anomalyType: AnomalyType;
  expectedCount: number;
  actualCount: number;
  pageSequence: number[];
  pageSequenceValid: boolean;
  createdAt: string;
  updatedAt: string;
  source: DataSource[];
  backupGaps: BackupGap[];
  processingNotes: ProcessingNote[];
  slowQueryLogs: SlowQueryLog[];
  auditLogs: AuditLog[];
  exportBatches: ExportBatch[];
}

export interface DataSource {
  id: string;
  sourceType: DataSourceType;
  sourcePath: string;
  recordCount: number;
  timestamp: string;
  pageNumber: number;
}

export interface BackupGap {
  id: string;
  gapStart: string;
  gapEnd: string;
  missingCount: number;
  sourceTable: string;
  impactLevel: ImpactLevel;
  expectedCount: number;
  actualCount: number;
  detailRecords: GapDetail[];
}

export interface GapDetail {
  id: string;
  timeSlot: string;
  expected: number;
  actual: number;
  delta: number;
  explanation: string;
}

export interface ProcessingNote {
  id: string;
  type: 'system' | 'manual';
  content: string;
  source: string;
  createdAt: string;
}

export interface SlowQueryLog {
  id: string;
  queryId: string;
  executionTime: number;
  startTime: string;
  sqlContent: string;
  operator: string;
  recordedAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  operator: string;
  timestamp: string;
  detail: string;
}

export interface ExportBatch {
  id: string;
  batchNumber: string;
  exportTime: string;
  operator: string;
  format: ExportFormat;
}

export interface FilterState {
  status: ArchiveStatus | 'all';
  anomalyType: AnomalyType | 'all';
  dateRange: {
    start: string;
    end: string;
  };
}

export const statusLabelMap: Record<ArchiveStatus | 'all', string> = {
  all: '全部',
  success: '顺利',
  pending: '待确认',
  error: '异常',
};

export const anomalyTypeLabelMap: Record<AnomalyType | 'all', string> = {
  all: '全部异常类型',
  none: '无异常',
  backup_gap: '备份缺口',
  page_sequence: '分页顺序异常',
  slow_query: '慢查询异常',
};

export const dataSourceTypeLabelMap: Record<DataSourceType, string> = {
  full_backup: '全量备份',
  incremental_backup: '增量备份',
  binlog: 'Binlog日志',
  manual: '手动导入',
};

export const impactLevelLabelMap: Record<ImpactLevel, string> = {
  high: '高',
  medium: '中',
  low: '低',
};
