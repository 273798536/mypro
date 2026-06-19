export type MigrationStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked';
export type AnomalyType = 'backup_gap' | 'permission_missing' | 'compression_abnormal' | 'caliber_inconsistent' | 'other';
export type AnomalySeverity = 'warning' | 'error';
export type AnomalyStatus = 'pending' | 'processing' | 'resolved';
export type NextAction = '补材料' | '改口径' | '待确认';

export interface Run {
  id: number;
  run_name: string;
  import_time: string;
  filename: string;
  total_records: number;
  anomaly_count: number;
  status: 'completed' | 'processing';
}

export interface Anomaly {
  id: number;
  record_id: number;
  anomaly_type: AnomalyType;
  severity: AnomalySeverity;
  description: string;
  next_action: NextAction;
  source_details: string;
  handling_opinion: string;
  status: AnomalyStatus;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: number;
  record_id: number;
  permission_name: string;
  grantee: string;
  granted_by: string;
  granted_at: string;
  status: 'active' | 'revoked';
}

export interface ReportRecord {
  id: number;
  run_id: number;
  report_name: string;
  table_name: string;
  column_count: number;
  row_count: number;
  original_size_mb: number;
  compressed_size_mb: number;
  compression_ratio: number;
  source_system: string;
  owner: string;
  backup_exists: boolean;
  migration_status: MigrationStatus;
  created_at: string;
  anomalies: Anomaly[];
  permissions: Permission[];
}

export interface OverviewStats {
  total: number;
  withAnomaly: number;
  errorCount: number;
  warningCount: number;
  byAnomalyType: Record<string, number>;
  byMigrationStatus: Record<string, number>;
}

export const ANOMALY_TYPE_LABELS: Record<AnomalyType, string> = {
  backup_gap: '备份缺口',
  permission_missing: '权限缺失',
  compression_abnormal: '压缩率异常',
  caliber_inconsistent: '口径不一致',
  other: '其他异常'
};

export const ANOMALY_TYPE_COLORS: Record<AnomalyType, string> = {
  backup_gap: '#ff4d4f',
  permission_missing: '#fa8c16',
  compression_abnormal: '#faad14',
  caliber_inconsistent: '#722ed1',
  other: '#8c8c8c'
};

export const MIGRATION_STATUS_LABELS: Record<MigrationStatus, string> = {
  not_started: '未开始',
  in_progress: '进行中',
  completed: '已完成',
  blocked: '已阻塞'
};

export const MIGRATION_STATUS_COLORS: Record<MigrationStatus, string> = {
  not_started: '#bfbfbf',
  in_progress: '#1677ff',
  completed: '#52c41a',
  blocked: '#ff4d4f'
};

export const ANOMALY_STATUS_LABELS: Record<AnomalyStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已解决'
};

export const ANOMALY_STATUS_COLORS: Record<AnomalyStatus, string> = {
  pending: '#ff4d4f',
  processing: '#faad14',
  resolved: '#52c41a'
};
