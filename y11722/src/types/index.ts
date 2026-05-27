export type AngleUnit = 'degree' | 'radian';
export type MotionStatus = 'static' | 'sliding' | 'critical';
export type ImportStrategy = 'ignore' | 'overwrite' | 'append';
export type AnomalyType = 'critical_angle' | 'angle_unit' | 'force_direction' | 'data_conflict';
export type AnomalySeverity = 'warning' | 'error';
export type ForceDirection = 'up' | 'down' | 'horizontal';

export interface ExperimentParams {
  id: string;
  angle: number;
  angleUnit: AngleUnit;
  frictionCoefficient: number;
  mass: number;
  externalForce: number;
  externalForceAngle: number;
  externalForceDirection: ForceDirection;
}

export interface ForceAnalysis {
  gravity: number;
  normalForce: number;
  gravityParallel: number;
  gravityPerpendicular: number;
  frictionForce: number;
  maxStaticFriction: number;
  externalForceParallel: number;
  externalForcePerpendicular: number;
  netForce: number;
  acceleration: number;
  status: MotionStatus;
  criticalAngle: number;
}

export interface Anomaly {
  type: AnomalyType;
  severity: AnomalySeverity;
  message: string;
  suggestion: string;
  detectedAt: Date;
}

export interface ExperimentRecord {
  id: string;
  version: number;
  params: ExperimentParams;
  analysis: ForceAnalysis;
  source: string;
  createdAt: Date;
  updatedAt: Date;
  anomalies: Anomaly[];
  screenshot?: string;
  steps?: string[];
  notes?: string;
  studentJudgment?: MotionStatus;
}

export interface ImportResult {
  success: boolean;
  totalRecords: number;
  importedRecords: number;
  skippedRecords: number;
  overwrittenRecords: number;
  anomalies: Anomaly[];
}

export interface CanvasState {
  blockPosition: number;
  velocity: number;
  isAnimating: boolean;
}

export const GRAVITY = 9.8;
export const EPSILON = 0.001;
export const CRITICAL_THRESHOLD = 0.02;
