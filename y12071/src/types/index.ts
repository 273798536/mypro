export type Point3D = [number, number, number];

export type Severity = 'high' | 'medium' | 'low';

export type DetectionType = 'offset' | 'missing_support' | 'sensor_offline' | 'route_conflict';

export type SupportStatus = 'normal' | 'offset' | 'missing';

export type SensorStatus = 'online' | 'offline' | 'warning';

export interface TunnelSegment {
  id: string;
  startPoint: Point3D;
  endPoint: Point3D;
  radius: number;
  expectedPosition?: Point3D;
  metadata?: Record<string, unknown>;
}

export interface SupportPoint {
  id: string;
  position: Point3D;
  expectedPosition: Point3D;
  type: 'anchor' | 'bolt' | 'mesh';
  status: SupportStatus;
  offsetDistance?: number;
}

export interface Sensor {
  id: string;
  position: Point3D;
  type: 'stress' | 'displacement' | 'gas';
  status: SensorStatus;
  value: number;
  name: string;
}

export interface PersonnelRoute {
  id: string;
  points: Point3D[];
  timestamp: string;
  name: string;
}

export interface OffsetInfo {
  expected: Point3D;
  actual: Point3D;
  distance: number;
  direction: Point3D;
}

export interface DetectionResult {
  id: string;
  type: DetectionType;
  severity: Severity;
  description: string;
  position: Point3D;
  offset?: OffsetInfo;
  affectedByRoute?: boolean;
  relatedEntityId?: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  tunnelSegments: TunnelSegment[];
  supportPoints: SupportPoint[];
  sensors: Sensor[];
  personnelRoute?: PersonnelRoute;
}

export interface DetectionState {
  isDetecting: boolean;
  firstPassResults: DetectionResult[];
  secondPassResults: DetectionResult[];
  hasPersonnelRoute: boolean;
  detectionCount: number;
}

export interface UIState {
  showLabels: boolean;
  showSectionPlane: boolean;
  sectionPlanePosition: Point3D;
  sectionPlaneNormal: Point3D;
  selectedDetectionId: string | null;
  compareMode: boolean;
}
