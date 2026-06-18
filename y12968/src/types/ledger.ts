export type AnomalyType = 'backup_gap' | 'slow_query' | 'refresh_fail' | 'normal';
export type Severity = 'critical' | 'warning' | 'info';
export type RecordStatus = 'pending' | 'processing' | 'resolved' | 'archived';

export interface RefreshRecord {
  id: string;
  view_name: string;
  refresh_time: string;
  anomaly_type: AnomalyType;
  severity: Severity;
  source_row_number: string;
  source_table: string;
  source_image?: string;
  source_remark?: string;
  handling_opinion?: string;
  conclusion?: string;
  handler?: string;
  handled_at?: string;
  ticket_id?: string;
  ticket_summary?: string;
  ticket_link?: string;
  status: RecordStatus;
  import_batch: string;
  is_supplement: boolean;
  supplement_of?: string;
  slow_query_analysis?: string;
  created_at: string;
  updated_at: string;
}

export interface FilterState {
  anomalyTypes: AnomalyType[];
  severities: Severity[];
  statuses: RecordStatus[];
  viewNameKeyword: string;
  dateRange: {
    start: string;
    end: string;
  };
  onlyAnomaly: boolean;
  onlyDuplicates: boolean;
}

export interface DuplicateGroup {
  group_id: string;
  records: RefreshRecord[];
  similarity: number;
  conflicting_fields: string[];
  suggestion: 'merge' | 'review' | 'keep_both';
}

export const ANOMALY_TYPE_LABELS: Record<AnomalyType, string> = {
  backup_gap: '备份缺口',
  slow_query: '慢查询',
  refresh_fail: '刷新失败',
  normal: '正常',
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: '严重',
  warning: '警告',
  info: '提示',
};

export const STATUS_LABELS: Record<RecordStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已解决',
  archived: '已归档',
};

export const DEFAULT_FILTERS: FilterState = {
  anomalyTypes: [],
  severities: [],
  statuses: [],
  viewNameKeyword: '',
  dateRange: { start: '', end: '' },
  onlyAnomaly: false,
  onlyDuplicates: false,
};
