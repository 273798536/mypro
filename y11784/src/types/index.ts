export interface Point2D {
  x: number;
  y: number;
}

export interface PathNode extends Point2D {
  id: string;
  order: number;
}

export interface VectorField {
  id: string;
  name: string;
  expressionX: string;
  expressionY: string;
  source: string;
  range: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Path {
  id: string;
  vectorFieldId: string;
  name: string;
  color: string;
  studentRemark: string;
  source: string;
  nodes: PathNode[];
  createdAt: string;
  updatedAt: string;
}

export type IntegrationMethod = 'trapezoidal' | 'simpson' | 'adaptiveSimpson' | 'gaussLegendre';

export interface IntegrationConfig {
  method: IntegrationMethod;
  stepSize: number;
  adaptiveTolerance?: number;
  gaussOrder?: number;
}

export interface Anomaly {
  id: string;
  resultId: string;
  type: 'selfIntersection' | 'largeStepSize' | 'directionReversal';
  severity: 'warning' | 'error';
  description: string;
  positionX?: number;
  positionY?: number;
}

export interface IntegrationResult {
  id: string;
  pathId: string;
  value: number;
  method: IntegrationMethod;
  stepSize: number;
  errorEstimate: number;
  computationTime: number;
  hasAnomalies: boolean;
  anomalies: Anomaly[];
  sampledPoints: Point2D[];
  computedAt: string;
}

export type ConflictStrategy = 'ignore' | 'overwrite' | 'append';

export interface ImportConflict {
  type: 'vectorField' | 'path';
  existingId: string;
  newId: string;
  existingName: string;
  newName: string;
}

export interface ImportResult {
  vectorFields: VectorField[];
  paths: Path[];
  conflicts: ImportConflict[];
  errors: string[];
}

export interface RevisionEntry {
  id: string;
  targetType: 'vectorField' | 'path' | 'integrationConfig';
  targetId: string;
  action: 'create' | 'update' | 'delete' | 'import';
  previousValue: unknown;
  newValue: unknown;
  source: string;
  correctionNote: string;
  timestamp: string;
}

export interface PresetVectorField {
  name: string;
  expressionX: string;
  expressionY: string;
  description: string;
  range: { minX: number; maxX: number; minY: number; maxY: number };
}

export interface ExportConfig {
  includeVectorField: boolean;
  includePaths: boolean;
  includeResults: boolean;
  includeAnomalies: boolean;
  includeRevisionHistory: boolean;
}
