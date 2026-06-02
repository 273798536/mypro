export type LengthUnit = 'm' | 'cm' | 'mm';

export type AngleUnit = 'deg' | 'rad';

export type AnomalyType = 
  | 'large_angle_approx'
  | 'length_unit_error'
  | 'timing_missed'
  | 'none';

export interface PendulumRecord {
  id: string;
  batchId: string;
  length: number;
  lengthUnit: LengthUnit;
  lengthUnitConfirmed: boolean;
  angle: number;
  angleUnit: AngleUnit;
  measuredPeriod: number;
  measuredCount: number;
  totalTiming: number;
  timestamp: number;
  notes: string;
  sourceRef?: string;
}

export interface PeriodCalculation {
  recordId: string;
  smallAnglePeriod: number;
  largeAnglePeriod: number;
  largeAngleCorrection: number;
  smallAngleApproxError: number;
  largeAngleApproxError: number;
  measuredError: number;
  usesLargeAngle: boolean;
}

export interface ErrorEstimate {
  recordId: string;
  lengthError: number;
  angleError: number;
  timingError: number;
  countError: number;
  systematicError: number;
  randomError: number;
  totalError: number;
  errorSources: ErrorSource[];
}

export interface ErrorSource {
  type: string;
  value: number;
  description: string;
}

export interface AnomalyInfo {
  recordId: string;
  type: AnomalyType;
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
  affectedFields: string[];
}

export interface Batch {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  recordIds: string[];
}

export interface ReportExport {
  id: string;
  batchId: string;
  recordIds: string[];
  createdAt: number;
  exportedAt: number;
  format: 'json' | 'csv' | 'pdf';
  title: string;
  summary: ReportSummary;
}

export interface ReportSummary {
  totalRecords: number;
  averagePeriod: number;
  averageError: number;
  anomalyCount: number;
  largeAngleCount: number;
  unitErrorCount: number;
  timingMissCount: number;
}

export interface AppState {
  batches: Batch[];
  records: PendulumRecord[];
  calculations: PeriodCalculation[];
  errorEstimates: ErrorEstimate[];
  anomalies: AnomalyInfo[];
  reports: ReportExport[];
  selectedRecordId: string | null;
  selectedBatchId: string | null;
  tracePath: TracePath | null;
}

export interface TracePath {
  from: 'record' | 'calculation' | 'error' | 'anomaly';
  recordId: string;
  step: 'record' | 'calculation' | 'error' | 'anomaly';
}

export const PHYSICAL_CONSTANTS = {
  g: 9.80665,
  SMALL_ANGLE_THRESHOLD: 0.1745,
  LARGE_ANGLE_THRESHOLD: 0.5236,
  SIGNIFICANT_ANGLE_ERROR: 0.01,
} as const;
