export type CoordinateSystem = 'local' | 'world' | 'geographic';

export type RecordStatus = 'ok' | 'duplicate' | 'review-required';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface PipelinePoint {
  id: string;
  position: Vector3;
  coordinateSystem: CoordinateSystem;
}

export interface PipelineSegment {
  id: string;
  start: PipelinePoint;
  end: PipelinePoint;
  diameter: number;
  name: string;
}

export interface Obstacle {
  id: string;
  name: string;
  type: 'pile' | 'structure' | 'rock' | 'other-pipeline';
  position: Vector3;
  size: Vector3;
  coordinateSystem: CoordinateSystem;
  rotation?: Vector3;
}

export interface CameraView {
  position: Vector3;
  target: Vector3;
  up: Vector3;
  fov: number;
}

export interface SavedView {
  id: string;
  name: string;
  camera: CameraView;
  note: string;
  sourceImage?: string;
  sourceRow?: number;
  createdAt: number;
  thumbnail?: string;
}

export interface SourceRef {
  fileName: string;
  rowNumber: number;
  remark?: string;
}

export interface PipelineRecord {
  id: string;
  name: string;
  pipeline: PipelineSegment;
  coordinateSystem: CoordinateSystem;
  source: SourceRef;
  status: RecordStatus;
  issues: string[];
  duplicateOf?: string;
  createdAt: number;
}

export interface CollisionResult {
  obstacleId: string;
  obstacleName: string;
  distance: number;
  safeDistance: number;
  isViolation: boolean;
  closestPoint: Vector3;
}

export type AlertType = 'danger' | 'warning' | 'info';

export interface AlertMessage {
  id: string;
  type: AlertType;
  message: string;
  timestamp: number;
}
