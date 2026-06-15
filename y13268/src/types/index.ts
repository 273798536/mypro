export type PointStatus = 'processed' | 'pending_field' | 'conflict' | 'over_capacity';

export type CapacitySeverity = 'normal' | 'warning' | 'danger';

export type ActionType = 'import' | 'field_map' | 'status_change' | 'manual_confirm' | 'capacity_adjust';

export type SourceType = 'site_survey' | 'design_institute' | 'power_company' | 'community_report';

export interface Point {
  id: string;
  name: string;
  community: string;
  address: string;
  capacity: number;
  limit: number;
  chargerCount: number;
  status: PointStatus;
  source: SourceType;
  planType: string;
  createTime: string;
  updateTime: string;
  assignee?: string;
  remark?: string;
}

export interface LedgerRecord {
  id: string;
  pointId: string;
  pointName: string;
  source: SourceType;
  sourceName: string;
  rawFields: Record<string, string | number>;
  mappedFields: Record<string, string | number>;
  importTime: string;
  importOperator: string;
  isMapped: boolean;
}

export interface FieldMappingConfig {
  sourceField: string;
  standardField: string;
  source: SourceType;
  isAutoMapped: boolean;
}

export interface ReviewTask {
  id: string;
  pointId: string;
  pointName: string;
  status: PointStatus;
  assignee?: string;
  assigneeName?: string;
  createTime: string;
  updateTime: string;
  deadline?: string;
  remark?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface HistoryLog {
  id: string;
  pointId: string;
  pointName: string;
  operator: string;
  action: ActionType;
  actionName: string;
  beforeData: Record<string, unknown>;
  afterData: Record<string, unknown>;
  reason: string;
  time: string;
}

export interface CapacityCheckResult {
  isOver: boolean;
  exceedValue: number;
  exceedRatio: number;
  severity: CapacitySeverity;
  nextSteps: string[];
}

export interface SourceInfo {
  type: SourceType;
  name: string;
  color: string;
}

export const SOURCE_LIST: SourceInfo[] = [
  { type: 'site_survey', name: '现场勘查', color: 'bg-blue-100 text-blue-700' },
  { type: 'design_institute', name: '设计院', color: 'bg-purple-100 text-purple-700' },
  { type: 'power_company', name: '供电所', color: 'bg-green-100 text-green-700' },
  { type: 'community_report', name: '社区上报', color: 'bg-amber-100 text-amber-700' },
];

export const STATUS_LIST: { value: PointStatus; label: string; className: string }[] = [
  { value: 'processed', label: '已处理', className: 'status-badge-success' },
  { value: 'pending_field', label: '待现场看', className: 'status-badge-warning' },
  { value: 'conflict', label: '冲突记录', className: 'status-badge-danger' },
  { value: 'over_capacity', label: '容量超限', className: 'status-badge-danger' },
];

export const ACTION_LIST: { value: ActionType; label: string }[] = [
  { value: 'import', label: '导入台账' },
  { value: 'field_map', label: '字段映射' },
  { value: 'status_change', label: '状态变更' },
  { value: 'manual_confirm', label: '人工确认' },
  { value: 'capacity_adjust', label: '容量调整' },
];
