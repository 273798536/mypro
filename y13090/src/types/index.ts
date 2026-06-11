export interface SensorRecord {
  id: string;
  timestamp: string;
  area: string;
  materialName: string;
  standardMaterialName: string;
  floor: string;
  normalizedFloor: number;
  position: { x: number; y: number; z: number };
  nameMismatch: boolean;
  floorUnitMixed: boolean;
  status: 'normal' | 'warning' | 'error';
}

export interface Anomaly {
  id: string;
  type: 'name_mismatch' | 'floor_unit_mixed';
  recordId: string;
  description: string;
  linkedConclusion?: string;
}

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export interface ViewSnapshot {
  id: string;
  name: string;
  timestamp: string;
  filterConditions: FilterConditions;
  cameraState: CameraState;
  screenshotDataUrl?: string;
}

export interface FilterConditions {
  timeRange: [string, string] | null;
  area: string | null;
  materialType: string | null;
  showOnlyAnomaly: boolean;
}

export interface ReviewResult {
  records: SensorRecord[];
  anomalies: Anomaly[];
  stats: {
    total: number;
    anomalyCount: number;
    nameMismatchCount: number;
    floorUnitMixedCount: number;
  };
}
