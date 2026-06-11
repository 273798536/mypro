export type BatchStatus = 'pending' | 'rejudged' | 'completed';

export type AnomalyType = 'overlap' | 'out_of_bounds' | 'missing_coord' | 'format_error';

export type CollisionStatus = 'confirmed' | 'false_positive' | 'needs_review';

export type DataSource = 'laser_scan' | 'manual_entry' | 'system_import';

export type CameraAngle = 'front' | 'side' | 'top' | 'iso';

export interface Batch {
  id: string;
  batchNo: string;
  warehouseName: string;
  status: BatchStatus;
  totalPoints: number;
  anomalyCount: number;
  detectedAt: string;
}

export interface Point {
  id: string;
  batchId: string;
  objectName: string;
  source: DataSource;
  rawX: string | null;
  rawY: string | null;
  rawZ: string | null;
  parsedX: number | null;
  parsedY: number | null;
  parsedZ: number | null;
  isDirty: boolean;
  createdAt: string;
}

export interface Collision {
  id: string;
  batchId: string;
  type: AnomalyType;
  objectA?: string;
  objectB?: string;
  pointId?: string;
  status: CollisionStatus;
  description: string;
  detectedAt: string;
  rejudgedBy?: string;
  rejudgedReason?: string;
  rejudgedAt?: string;
}

export interface HistoryRecord {
  id: string;
  collisionId: string;
  batchId: string;
  operator: string;
  oldStatus: CollisionStatus;
  newStatus: CollisionStatus;
  reason: string;
  createdAt: string;
}

export interface SavedView {
  id: string;
  name: string;
  anomalyTypes: AnomalyType[];
  statusFilter: CollisionStatus[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  cameraAngle: CameraAngle;
  createdBy: string;
  createdAt: string;
}

export interface RejudgePayload {
  newStatus: CollisionStatus;
  reason: string;
  operator: string;
}

export interface BatchDetail extends Batch {
  points: Point[];
  collisions: Collision[];
}

export const ANOMALY_TYPE_LABELS: Record<AnomalyType, string> = {
  overlap: '对象重叠',
  out_of_bounds: '越界坐标',
  missing_coord: '坐标缺失',
  format_error: '格式异常',
};

export const COLLISION_STATUS_LABELS: Record<CollisionStatus, string> = {
  confirmed: '确认碰撞',
  false_positive: '排除误报',
  needs_review: '待复核',
};

export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  pending: '待审核',
  rejudged: '已改判',
  completed: '已完成',
};

export const DATA_SOURCE_LABELS: Record<DataSource, string> = {
  laser_scan: '激光扫描',
  manual_entry: '人工录入',
  system_import: '系统导入',
};

export const CAMERA_ANGLE_LABELS: Record<CameraAngle, string> = {
  front: '正视图',
  side: '侧视图',
  top: '俯视图',
  iso: '等距视图',
};
