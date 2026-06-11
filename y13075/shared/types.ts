export type PointStatus = 'normal' | 'pending' | 'confirmed_anomaly' | 'dismissed';

export const POINT_STATUS_LABEL: Record<PointStatus, string> = {
  normal: '正常',
  pending: '待确认',
  confirmed_anomaly: '已确认异常',
  dismissed: '已驳回',
};

export interface RawSource {
  file_name: string;
  import_time: string;
  line_number: number;
  raw_values: Record<string, any>;
}

export interface SensorRecord {
  id: string;
  point_id: string;
  row: number;
  col: number;
  temperature: number | null;
  humidity: number | null;
  raw_source: RawSource;
  is_dirty: boolean;
  dirty_reason?: string;
}

export type DetectionType = 'jump' | 'gap' | 'temp_delta' | 'duplicate' | 'missing_value';

export interface DetectionReason {
  type: DetectionType;
  description: string;
  detail: Record<string, any>;
}

export const DETECTION_TYPE_LABEL: Record<DetectionType, string> = {
  jump: '坐标跳变',
  gap: '编号缺口',
  temp_delta: '温差过大',
  duplicate: '重复编号',
  missing_value: '数值缺失',
};

export interface OperationLog {
  time: string;
  action: 'create' | 'status_change' | 'remark_edit' | 'dismiss' | 'confirm';
  operator: 'system' | 'reviewer' | 'operator';
  detail?: string;
}

export const ACTION_LABEL: Record<OperationLog['action'], string> = {
  create: '创建',
  status_change: '状态变更',
  remark_edit: '修改备注',
  dismiss: '驳回',
  confirm: '确认异常',
};

export interface Anomaly {
  id: string;
  sensor_record_id: string;
  point_id: string;
  status: PointStatus;
  detection_reason: DetectionReason;
  affected_points: string[];
  remark: string;
  operation_logs: OperationLog[];
  created_at: string;
  updated_at: string;
}

export interface ReportOptions {
  statuses?: PointStatus[];
  point_range?: { start: string; end: string };
  anomaly_ids?: string[];
}

export interface ReportResult {
  markdown: string;
  filename: string;
  anomaly_count: number;
}

export interface StatsSummary {
  total_records: number;
  total_anomalies: number;
  pending_count: number;
  reviewed_count: number;
  dirty_count: number;
}
