export type TaskStatus = 'pending' | 'running' | 'completed' | 'archived';

export type AnomalyType = 'distance_violation' | 'overlap' | 'depth_conflict';

export type AnomalyLevel = 'high' | 'medium' | 'low';

export type AnomalyStatus = 'unconfirmed' | 'confirmed_abnormal' | 'confirmed_normal';

export type TimelineEventType = 'status_change' | 'material_upload' | 'view_saved' | 'rule_changed' | 'task_created' | 'task_rerun';

export interface Task {
  id: string;
  name: string;
  status: TaskStatus;
  calculationRule: string;
  calculationVersion: string;
  wellCount: number;
  anomalyCount: number;
  unconfirmedCount: number;
  createdAt: string;
  updatedAt: string;
  operator: string;
}

export interface CalculationRule {
  id: string;
  name: string;
  version: string;
  distanceThresholds: {
    general: number;
    pollutionSource: number;
    waterSource: number;
  };
  depthConflictThreshold: number;
  description: string;
}

export interface CollisionAnomaly {
  id: string;
  taskId: string;
  wellName: string;
  wellId: string;
  obstacleId?: string;
  type: AnomalyType;
  level: AnomalyLevel;
  status: AnomalyStatus;
  position: { x: number; y: number };
  distance?: number;
  conflictingObject?: string;
  description: string;
  ruleSnapshot: string;
  createdAt: string;
  updatedAt: string;
  materials: MaterialRecord[];
  confirmHistory: ConfirmRecord[];
}

export interface ConfirmRecord {
  id: string;
  anomalyId: string;
  fromStatus: AnomalyStatus;
  toStatus: AnomalyStatus;
  remark: string;
  operator: string;
  timestamp: string;
  viewSnapshotId?: string;
}

export interface MaterialRecord {
  id: string;
  anomalyId: string;
  name: string;
  source: string;
  isSupplement: boolean;
  uploadedAt: string;
  operator: string;
  remark: string;
  fileSize?: number;
  fileType?: string;
  version?: number;
  fileData?: string;
}

export interface TimelineEvent {
  id: string;
  taskId: string;
  type: TimelineEventType;
  anomalyId?: string;
  anomalyName?: string;
  description: string;
  snapshot: Record<string, unknown>;
  timestamp: string;
  operator: string;
}

export interface ViewSnapshot {
  id: string;
  taskId: string;
  anomalyId?: string;
  name: string;
  viewState: {
    scale: number;
    offsetX: number;
    offsetY: number;
    centerX: number;
    centerY: number;
  };
  filterState?: Record<string, unknown>;
  createdAt: string;
  operator: string;
}

export interface LayerVersion {
  id: string;
  taskId: string;
  name: string;
  source: string;
  uploadedAt: string;
  operator: string;
  isActive: boolean;
}

export interface ExportRecord {
  id: string;
  taskId: string;
  filterMark: string;
  type: 'summary' | 'detail' | 'full';
  anomalyCount: number;
  exportedAt: string;
  operator: string;
}

export interface FilterState {
  types: AnomalyType[];
  levels: AnomalyLevel[];
  statuses: AnomalyStatus[];
  keyword: string;
}

export interface ViewState {
  scale: number;
  offsetX: number;
  offsetY: number;
  centerX: number;
  centerY: number;
}
