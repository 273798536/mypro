export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface CrystalDefect {
  id: string;
  position: Point3D;
  type: 'vacancy' | 'interstitial' | 'dislocation' | 'grain_boundary' | 'precipitate';
  radius: number;
  timestamp: number;
  properties: Record<string, string | number | boolean | undefined>;
}

export interface PointCloudData {
  points: CrystalDefect[];
  metadata: {
    material: string;
    clean: boolean;
    nullCount: number;
    duplicateCount: number;
    noteCount: number;
    importTimestamp: number;
    source: string;
  };
}

export interface MeasurementRecord {
  id: string;
  defectIds: string[];
  distance: number;
  timestamp: number;
  notes: string;
  conclusion: string;
  status: 'direct_use' | 'needs_review';
}

export interface TimeState {
  currentTime: number;
  totalDuration: number;
  isPlaying: boolean;
  playbackSpeed: number;
}

export interface CollisionEvent {
  id: string;
  time: number;
  defect1: string;
  defect2: string;
  distance: number;
  severity: 'low' | 'medium' | 'high';
}

export interface SlicePlane {
  normal: Point3D;
  distance: number;
  active: boolean;
}

export interface AppState {
  pointCloudData: PointCloudData | null;
  measurements: MeasurementRecord[];
  collisions: CollisionEvent[];
  timeState: TimeState;
  slicePlane: SlicePlane;
  selectedDefects: string[];
  history: {
    past: PointCloudData[];
    future: PointCloudData[];
  };
}

export interface DataStatus {
  hasNulls: boolean;
  hasDuplicates: boolean;
  hasNotes: boolean;
  needsReview: boolean;
}
