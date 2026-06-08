export interface RunBatch {
  id: string;
  name: string;
  runAt: string;
  operator: string;
  remark?: string;
}

export interface MeasurementRecord {
  id: string;
  batchId: string;
  cargoNo: string;
  cabinNo: string;
  positionX: number;
  positionY: number;
  positionZ: number;
  weight: number;
  volume: number;
  measurementSource: string;
  measurementDevice: string;
  measuredAt: string;
  rawDataSnapshot: string;
  createdAt: string;
}

export type AnomalyType =
  | 'TIMESTAMP_MISMATCH'
  | 'WEIGHT_OVERLOAD'
  | 'POSITION_OUTLIER'
  | 'VOLUME_MISMATCH';

export type AnomalySeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export type AnomalyStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Anomaly {
  id: string;
  recordId: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  description: string;
  status: AnomalyStatus;
  detectedAt: string;
}

export type ReviewActionType = 'APPROVE' | 'REJECT' | 'MODIFY';

export interface ReviewAction {
  id: string;
  anomalyId: string;
  operator: string;
  action: ReviewActionType;
  reason: string;
  beforeData?: string;
  afterData?: string;
  operatedAt: string;
}

export interface CutPlaneState {
  x: number | null;
  y: number | null;
  z: number | null;
}

export const ANOMALY_TYPE_LABEL: Record<AnomalyType, string> = {
  TIMESTAMP_MISMATCH: '时间轴不同步',
  WEIGHT_OVERLOAD: '重量超载',
  POSITION_OUTLIER: '位置偏离',
  VOLUME_MISMATCH: '体积不符',
};

export const ANOMALY_SEVERITY_LABEL: Record<AnomalySeverity, string> = {
  CRITICAL: '严重',
  WARNING: '警告',
  INFO: '提示',
};

export const ANOMALY_STATUS_LABEL: Record<AnomalyStatus, string> = {
  PENDING: '待复核',
  APPROVED: '已通过',
  REJECTED: '已驳回',
};

export const REVIEW_ACTION_LABEL: Record<ReviewActionType, string> = {
  APPROVE: '复核通过',
  REJECT: '驳回',
  MODIFY: '修改',
};
