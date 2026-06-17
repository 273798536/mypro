export type ComplaintStatus = '待确认' | '处理中' | '已结案' | '已归并' | '坐标异常';
export type ComplaintSource = '12345' | '社区群' | '现场走访' | '其他';
export type CoordIssueReason = 'GPS漂移' | '街口标注错误' | '数据录入错误' | '未知';
export type OperatorType = '老曹' | '系统' | '项目经理';
export type ApiMethod = 'start' | 'rerun' | 'view';

export interface RawComplaint {
  _id: string;
  [key: string]: unknown;
}

export interface StandardComplaint {
  id: string;
  occurredAt: string;
  intersection: string;
  lng: number;
  lat: number;
  source: ComplaintSource;
  status: ComplaintStatus;
  content: string;
  raw: RawComplaint;
  coordIssue?: CoordIssue;
  history: HistoryEntry[];
  mergeGroupId?: string;
  batch?: number;
}

export interface CoordIssue {
  offsetMeters: number;
  suspectedIntersection: string;
  affectedParkIds: string[];
  reason: string;
}

export interface HistoryEntry {
  ts: string;
  operator: OperatorType;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  note?: string;
}

export interface FieldMapping {
  occurredAt: string[];
  intersection: string[];
  lng: string[];
  lat: string[];
  source: string[];
  status: string[];
  content: string[];
}

export interface FilterState {
  dateRange: { start: string | null; end: string | null } | null;
  statuses: ComplaintStatus[];
  sources: ComplaintSource[];
  intersections: string[];
  hasCoordIssue: boolean | null;
  keyword: string;
}

export interface MergeSuggestion {
  groupId: string;
  intersection: string;
  complaintIds: string[];
  differences: Array<{
    complaintId: string;
    occurredAt: string;
    source: ComplaintSource;
    status: ComplaintStatus;
    contentSummary: string;
  }>;
}

export interface ParkGate {
  name: string;
  lng: number;
  lat: number;
}

export interface Park {
  id: string;
  name: string;
  centerLngLat: [number, number];
  polygon: [number, number][];
  boundary: Array<{ lng: number; lat: number }>;
  gates: ParkGate[];
}

export interface CityBlock {
  id: string;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}

export interface ApiLog {
  ts: string;
  method: ApiMethod;
  request: Record<string, unknown>;
  response: unknown;
  status: number;
  durationMs?: number;
}
