export interface Operator {
  id: string;
  name: string;
  department: string;
  avatar?: string;
}

export interface Measurement {
  id: string;
  timestamp: Date;
  x: number;
  y: number;
  thickness: number;
  temperature: number;
  salinity: number;
  sensorId: string;
  confidence: number;
  isOutlier: boolean;
  outlierReviewStatus?: 'pending' | 'approved' | 'rejected' | 'modified';
  outlierReview?: OutlierReview;
  notes?: string;
}

export interface OutlierReview {
  reviewedBy: Operator;
  reviewedAt: Date;
  decision: 'keep' | 'remove' | 'modify';
  newValue?: number;
  reason: string;
  impactScope: string[];
}

export interface PointCloudSlice {
  id: string;
  name: string;
  timestamp: Date;
  measurementIds: string[];
  thicknessRange: { min: number; max: number };
  slicePosition: number;
  hasOldAnnotations: boolean;
  oldAnnotations?: string[];
  status: 'draft' | 'reviewed' | 'finalized';
}

export interface IceModel3D {
  id: string;
  version: string;
  createdAt: Date;
  source: string;
  hasOldAnnotations: boolean;
  pointCount: number;
  boundingBox: {
    xMin: number; xMax: number;
    yMin: number; yMax: number;
    zMin: number; zMax: number;
  };
}

export interface Conclusion {
  id: string;
  version: number;
  timestamp: Date;
  author: Operator;
  sliceId: string;
  content: string;
  averageThickness: number;
  maxThickness: number;
  minThickness: number;
  outlierCount: number;
  riskLevel: 'low' | 'medium' | 'high';
  superseded: boolean;
  supersededById?: string;
  affectedPoints: string[];
}

export interface ConclusionDiff {
  locationId: string;
  oldConclusion: Conclusion | null;
  newConclusion: Conclusion | null;
  diffType: 'added' | 'removed' | 'modified' | 'unchanged';
  affectedPoints: string[];
  severity: 'critical' | 'major' | 'minor';
  changes: {
    field: string;
    before: any;
    after: any;
  }[];
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  operator: Operator;
  operation: {
    type: 'create' | 'update' | 'delete' | 'review' | 'approve' | 'reject';
    target: {
      type: 'measurement' | 'model' | 'slice' | 'conclusion' | 'parameter';
      id: string;
      name: string;
    };
  };
  changes: {
    field: string;
    before: any;
    after: any;
  }[];
  reason: string;
  attachments?: string[];
  impactScope: string[];
}

export interface ParameterSet {
  id: string;
  name: string;
  sigmaThreshold: number;
  minConfidence: number;
  thicknessTolerance: number;
  outlierAction: 'review' | 'auto-remove' | 'flag';
  version: number;
  updatedAt: Date;
  updatedBy: Operator;
}

export interface ParameterDiff {
  param: string;
  beforeValue: any;
  afterValue: any;
  changeType: 'numeric' | 'boolean' | 'reference' | 'added' | 'removed';
}

export interface SyncIssue {
  id: string;
  type: 'timestamp_drift' | 'order_violation' | 'missing_dependency' | 'clock_skew';
  severity: 'error' | 'warning' | 'info';
  description: string;
  affectedMaterials: {
    type: string;
    id: string;
    name: string;
    timestamp: Date;
  }[];
  recommendation: string;
}

export interface SystemSnapshot {
  id: string;
  timestamp: Date;
  measurements: Measurement[];
  conclusions: Conclusion[];
  parameters: ParameterSet;
  auditCount: number;
}

export type GamePhase = 'idle' | 'playing' | 'paused' | 'settled' | 'reviewing';

export interface ScenarioConfig {
  id: string;
  name: string;
  description: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  materials: {
    models: IceModel3D[];
    measurements: Measurement[];
    slices: PointCloudSlice[];
  };
  parameters: ParameterSet;
  syncIssues: SyncIssue[];
  auditRecords: AuditEntry[];
  conclusions: Conclusion[];
  operators: Operator[];
}
