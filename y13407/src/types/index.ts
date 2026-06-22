export type BatchStatus = 'pending' | 'reviewing' | 'exception' | 'done';

export type TimelineEventType =
  | 'create'
  | 'calculate'
  | 'review'
  | 'status_change'
  | 'note_update'
  | 'export';

export interface Assumptions {
  symbolMapping: Record<string, string>;
  samplingMethod: string;
  confidenceLevel: number;
  exclusions: string[];
}

export interface VersionSnapshot {
  id: string;
  boardVersion: string;
  notationSystem: string;
  resultValue: number;
  diffNote: string;
}

export interface TimelineEvent {
  id: string;
  batchId: string;
  eventType: TimelineEventType;
  operator: string;
  timestamp: string;
  beforeValue?: string;
  afterValue: string;
  description: string;
}

export interface CalculationBatch {
  id: string;
  boardVersion: string;
  notationSystem: string;
  handler: string;
  status: BatchStatus;
  resultValue: number;
  unit: string;
  sourceBoard: string;
  assumptions: Assumptions;
  note: string;
  versions: VersionSnapshot[];
  timeline: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface FilterState {
  dateRange: { start: string; end: string } | null;
  handlers: string[];
  statuses: BatchStatus[];
  boardVersions: string[];
  search: string;
}

export const STATUS_LABELS: Record<BatchStatus, string> = {
  pending: '待复核',
  reviewing: '复核中',
  exception: '异常',
  done: '已完成',
};

export const EVENT_LABELS: Record<TimelineEventType, string> = {
  create: '创建批次',
  calculate: '执行计算',
  review: '复核',
  status_change: '状态变更',
  note_update: '补充说明',
  export: '导出数据',
};
