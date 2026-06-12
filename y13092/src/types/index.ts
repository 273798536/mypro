export interface Point {
  x: number;
  y: number;
}

export type CoordinateSystem = 'bj54' | 'wgs84' | 'local' | 'unknown';
export type ElementCategory = 'bridge' | 'tunnel' | 'platform' | 'other';
export type ElementType = 'line' | 'rect' | 'polygon' | 'circle';

export interface CadElement {
  id: string;
  type: ElementType;
  points: Point[];
  label?: string;
  category: ElementCategory;
}

export interface CadLayer {
  id: string;
  name: string;
  color: string;
  coordinateSystem: CoordinateSystem;
  visible: boolean;
  opacity: number;
  elements: CadElement[];
  source: string;
  importedAt: string;
}

export type CollisionType = 'hard' | 'soft' | 'clearance';
export type CollisionSeverity = 'critical' | 'warning' | 'info';
export type CollisionStatus = 'pending' | 'confirmed' | 'resolved' | 'revoked';

export interface CollisionPoint {
  id: string;
  layerA: string;
  layerB: string;
  x: number;
  y: number;
  type: CollisionType;
  severity: CollisionSeverity;
  status: CollisionStatus;
  description: string;
  calcBasis: string;
  relatedSegments: string[];
  isRevoked?: boolean;
}

export type OperationType = 'import' | 'adjust' | 'revoke' | 'confirm' | 'suspend' | 'report';

export interface OperationRecord {
  id: string;
  type: OperationType;
  operator: string;
  timestamp: string;
  description: string;
  isRevoked: boolean;
  details: Record<string, unknown>;
}

export interface ViewSnapshot {
  id: string;
  name: string;
  scale: number;
  centerX: number;
  centerY: number;
  visibleLayers: string[];
  createdAt: string;
}

export type SegmentStatus = 'completed' | 'in_progress' | 'suspended' | 'missing';

export interface TimeSegment {
  id: string;
  startTime: string;
  endTime: string;
  status: SegmentStatus;
  description: string;
  responsible: string;
}

export interface DetectionSession {
  id: string;
  name: string;
  status: 'active' | 'suspended' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface ViewState {
  scale: number;
  centerX: number;
  centerY: number;
}
