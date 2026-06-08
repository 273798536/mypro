export type OutlierType = 'drift' | 'camera-loss' | 'interference' | 'noise' | 'unknown';
export type SolutionType = 're-run' | 're-record' | 'manual';
export type PointStatus = 'raw' | 'processed' | 're-run' | 're-recorded' | 'manually-verified' | 'discarded';

export interface MaterialSegment {
  id: string;
  name: string;
  startIndex: number;
  endIndex: number;
  sourceFile: string;
}

export interface ChangeRecord {
  timestamp: number;
  field: 'x' | 'y' | 'z' | 'isOutlier' | 'status';
  oldValue: number | boolean | string;
  newValue: number | boolean | string;
  operator: string;
}

export interface ShotPoint {
  id: string;
  index: number;
  timestamp: number;
  x: number;
  y: number;
  z: number;
  originalX: number;
  originalY: number;
  originalZ: number;
  isOutlier: boolean;
  outlierType: OutlierType;
  source: string;
  confidence: number;
  status: PointStatus;
  materialId: string;
  materialName: string;
  notes?: string;
  changeHistory: ChangeRecord[];
}

export interface SolutionExecution {
  type: SolutionType;
  applied: boolean;
  appliedAt?: number;
  operator: string;
  notes?: string;
  affectedPointIds: string[];
}

export interface ShotSession {
  id: string;
  name: string;
  points: ShotPoint[];
  createdAt: number;
  materialName: string;
  materialSegments: MaterialSegment[];
  hasCameraLoss: boolean;
  cameraLossSegments: Array<{ start: number; end: number }>;
  solutions: Record<SolutionType, SolutionExecution>;
  processed: boolean;
  conclusions: {
    raw: string;
    processed?: string;
  };
}

export interface ConclusionDiff {
  oldConclusion: string;
  newConclusion: string;
  affectedPoints: Array<{
    id: string;
    field: string;
    oldValue: string;
    newValue: string;
  }>;
}
