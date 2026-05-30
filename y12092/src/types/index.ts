export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Camera {
  id: string;
  name: string;
  number: string;
  position: Vector3;
  rotation: {
    pan: number;
    tilt: number;
    roll: number;
  };
  lens: {
    focalLength: number;
    fov: number;
    near: number;
    far: number;
  };
  operator: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export type VenueObjectType = 'wall' | 'pillar' | 'restricted' | 'field' | 'stand';

export interface VenueObject {
  id: string;
  name: string;
  type: VenueObjectType;
  position: Vector3;
  size: {
    width: number;
    height: number;
    depth: number;
  };
  isRestricted: boolean;
}

export type ConflictType = 'position' | 'occlusion' | 'boundary';
export type ConflictSeverity = 'critical' | 'warning' | 'info';
export type ConflictStatus = 'pending' | 'resolved' | 'accepted';

export interface ConflictEvidence {
  id: string;
  type: 'distance' | 'raycast' | 'frustum' | 'history';
  data: Record<string, any>;
  description: string;
}

export interface Conflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  cameraAId: string;
  cameraBId?: string;
  venueObjectId?: string;
  description: string;
  humanDescription: string;
  status: ConflictStatus;
  detectedAt: string;
  evidence: ConflictEvidence[];
}

export interface CameraHistory {
  id: string;
  cameraId: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  operator: string;
  changedAt: string;
}

export interface MergeDecision {
  id: string;
  cameraId: string;
  fieldName: string;
  choice: 'a' | 'b' | 'both';
  valueA: string;
  valueB: string;
  decidedAt: string;
}

export interface MergeRecord {
  id: string;
  sourceA: string;
  sourceB: string;
  mergedAt: string;
  mergedBy: string;
  decisions: MergeDecision[];
}

export interface CameraRoute {
  id: string;
  cameraId: string;
  waypoints: {
    position: Vector3;
    time: number;
    label?: string;
  }[];
  duration: number;
  description: string;
}

export interface MergeFieldConflict {
  cameraId: string;
  fieldName: string;
  valueA: any;
  valueB: any;
  resolved: boolean;
  decision?: 'a' | 'b' | 'both';
}

export interface Annotation {
  id: string;
  type: 'arrow' | 'text' | 'rect' | 'circle';
  position: { x: number; y: number };
  endPosition?: { x: number; y: number };
  text?: string;
  color: string;
}
