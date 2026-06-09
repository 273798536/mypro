export interface BatchMaterial {
  id: string;
  name: string;
  materialCode: string;
  createdAt: string;
  status: 'pending' | 'processing' | 'reviewed' | 'completed';
  anomalyCount: number;
}

export interface PointCloudData {
  id: string;
  batchId: string;
  points: Float32Array;
  colors: Float32Array;
  bounds: {
    minX: number; maxX: number;
    minY: number; maxY: number;
    minZ: number; maxZ: number;
  };
}

export interface SliceParam {
  planeX: number;
  planeY: number;
  planeZ: number;
  normalX: number;
  normalY: number;
  normalZ: number;
  thickness_mm: number;
  spacing_mm: number;
  isOutOfBounds: boolean;
  outOfBoundReason: string | null;
}

export interface OutlierPoint {
  id: string;
  batchId: string;
  x_mm: number;
  y_mm: number;
  z_mm: number;
  deviationSigma: number;
  suspectedCause: string;
  suggestion: string;
  reviewed: boolean;
}

export interface CollisionFrame {
  id: string;
  batchId: string;
  timeSecond: number;
  hasCollision: boolean;
  collisionDetail: string;
  minDistance_mm: number;
  jointAngles: number[];
}

export interface MeasurementRecord {
  id: string;
  batchId: string;
  measuredAt: string;
  measuredValue_mm: number;
  measurePoint: string;
  operator: string;
}

export interface AnomalyItem {
  id: string;
  batchId: string;
  category: 'missing_data' | 'param_error' | 'algo_limit';
  categoryLabel: string;
  description: string;
  nextAction: '补材料' | '改口径';
  resolved: boolean;
}

export interface SliceFormulaInfo {
  formula: string;
  units: string;
  range: string;
  failureCases: string[];
}

export interface ExportReportData {
  batch: BatchMaterial;
  sliceParams: SliceParam;
  outlierPoints: OutlierPoint[];
  collisionFrames: CollisionFrame[];
  measurementRecords: MeasurementRecord[];
  anomalies: AnomalyItem[];
  generatedAt: string;
}
