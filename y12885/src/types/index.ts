export type DataQuality = 'raw' | 'cleaned' | 'pending' | 'approved' | 'rejected' | 'suspended' | 'recollect' | 'available';

export type AnomalyType = 'negative_depth' | 'missing_page' | 'coordinate_drift' | 'speed_abnormal' | 'time_gap';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type WarningLevel = 'warning' | 'alert' | 'critical';

export type OperationType = 'create' | 'update' | 'delete' | 'approve' | 'reject';

export type ReviewType = '轨迹清洗复核' | '预警确认复核' | '数据修正复核' | '轨迹补录复核';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export type UserRole = 'safety_officer' | 'marine_affairs';

export const REVIEW_TASK_TYPES: ReviewType[] = [
  '轨迹清洗复核',
  '预警确认复核',
  '数据修正复核',
  '轨迹补录复核',
];

export const WATER_QUALITY_PARAMS = {
  ph: 'PH值',
  temperature: '水温',
  salinity: '盐度',
  dissolved_oxygen: '溶解氧',
  turbidity: '浊度',
};

export const WATER_QUALITY_THRESHOLDS: Record<keyof typeof WATER_QUALITY_PARAMS, { min: number; max: number }> = {
  ph: { min: 7.5, max: 8.5 },
  temperature: { min: 10, max: 28 },
  salinity: { min: 28, max: 35 },
  dissolved_oxygen: { min: 5, max: 12 },
  turbidity: { min: 0, max: 50 },
};

export interface TrackPoint {
  id: string;
  shipId: string;
  shipName: string;
  timestamp: number;
  longitude: number;
  latitude: number;
  depth: number;
  speed: number;
  heading: number;
  dataQuality: DataQuality;
  source: string;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface AnomalyRecord {
  id: string;
  trackPointId: string;
  type: AnomalyType;
  severity: Severity;
  description: string;
  detectedAt: number;
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
  resolution?: string;
}

export interface VersionChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface VersionRecord {
  id: string;
  recordId: string;
  operatorName: string;
  changeType: string;
  before?: any;
  after?: any;
  remark?: string;
  timestamp: number;
}

export interface WaterQualityWarning {
  id: string;
  metric: keyof typeof WATER_QUALITY_PARAMS;
  metricName: string;
  value: number;
  threshold: number;
  level: WarningLevel;
  message: string;
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
}

export interface WaterQualityData {
  id: string;
  stationId: string;
  stationName: string;
  timestamp: number;
  location: { lat: number; lng: number };
  temperature: number;
  salinity: number;
  ph: number;
  dissolved_oxygen: number;
  turbidity: number;
  chlorophyll: number;
  warnings: WaterQualityWarning[];
}

export interface ReviewTask {
  id: string;
  type: ReviewType;
  title: string;
  description: string;
  priority: Severity;
  status: ReviewStatus;
  submitterName: string;
  createdAt: number;
  reviewerName?: string;
  reviewedAt?: number;
  rejectReason?: string;
  relatedRecordIds: string[];
  dataSnapshot?: {
    before: any;
    after: any;
    changes: VersionChange[];
  };
}

export interface ActionableErrorAction {
  label: string;
  type: 'primary' | 'secondary' | 'danger';
  handler: string;
}

export interface ActionableError {
  id: string;
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  actions: ActionableErrorAction[];
  context: Record<string, any>;
  timestamp: number;
}

export interface FilterState {
  shipIds: string[];
  timeRange: [number, number] | null;
  depthRange: [number, number];
  dataQualities: DataQuality[];
  anomalyTypes: AnomalyType[];
}

export interface ClippingPlanesState {
  x: { enabled: boolean; value: number };
  y: { enabled: boolean; value: number };
  z: { enabled: boolean; value: number };
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export interface DataStatistics {
  track: {
    total: number;
    ships: number;
    available: number;
    pending: number;
    suspended: number;
    recollect: number;
  };
  waterQuality: {
    total: number;
    stations: number;
    records: number;
    warnings: number;
  };
  review: {
    pending: number;
    approved: number;
    rejected: number;
  };
}

export const DATA_QUALITY_LABELS: Record<DataQuality, string> = {
  raw: '原始数据',
  cleaned: '已清洗',
  pending: '待复核',
  approved: '已通过',
  rejected: '已驳回',
  suspended: '暂缓使用',
  recollect: '需重新采集',
  available: '可用',
};

export const ANOMALY_TYPE_LABELS: Record<AnomalyType, string> = {
  negative_depth: '深度为负',
  missing_page: '轨迹断页',
  coordinate_drift: '坐标漂移',
  speed_abnormal: '航速异常',
  time_gap: '时间间隔异常',
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '严重',
};

export const WARNING_LEVEL_LABELS: Record<WarningLevel, string> = {
  warning: '预警',
  alert: '告警',
  critical: '严重告警',
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  safety_officer: '海事安全员',
  marine_affairs: '海事处审批员',
};

export const REVIEW_TYPE_LABELS: Record<string, string> = {
  '轨迹清洗复核': '轨迹清洗复核',
  '预警确认复核': '预警确认复核',
  '数据修正复核': '数据修正复核',
  '轨迹补录复核': '轨迹补录复核',
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: '待复核',
  approved: '已通过',
  rejected: '已驳回',
};

export const VIEW_MODES: Record<'marine_affairs' | 'safety_officer', string> = {
  marine_affairs: '海事处视角',
  safety_officer: '安全员视角',
};

export const SHIP_LIST = [
  { id: 'SHIP-001', name: '海洋勘探一号' },
  { id: 'SHIP-002', name: '深蓝监测船' },
  { id: 'SHIP-003', name: '碳汇采样船' },
];

export const MONITORING_STATIONS = [
  { id: 'ST-001', name: '东海监测站A', lat: 30.5, lng: 122.3 },
  { id: 'ST-002', name: '东海监测站B', lat: 30.8, lng: 122.6 },
  { id: 'ST-003', name: '南海监测站A', lat: 22.1, lng: 114.5 },
  { id: 'ST-004', name: '南海监测站B', lat: 21.8, lng: 114.2 },
  { id: 'ST-005', name: '黄海监测站A', lat: 35.2, lng: 120.8 },
];
