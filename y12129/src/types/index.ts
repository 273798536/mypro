export interface RemeasureRecord {
  id: string;
  measuredValue: number;
  measureTime: string;
  operator: string;
  reason: string;
}

export interface MeasurementPoint {
  id: string;
  pointName: string;
  batchNo: string;
  fixtureId: string;
  designSize: number;
  measuredValue: number;
  tolerance: number;
  measureTime: string;
  operator: string;
  rawDataRef: string;
  remeasureRecords?: RemeasureRecord[];
  isMissing?: boolean;
  isContaminated?: boolean;
  x: number;
}

export interface FittingResult {
  slope: number;
  intercept: number;
  rSquared: number;
  systematicOffset: number;
  residuals: { pointId: string; residual: number }[];
}

export interface CorrectedPoint {
  pointId: string;
  pointName: string;
  designSize: number;
  measuredValue: number;
  correctedValue: number;
  residual: number;
  tolerance: number;
  isPass: boolean;
  isMissing: boolean;
  isContaminated: boolean;
  rawDataRef: string;
  fixtureId: string;
  x: number;
}

export interface AnalysisSnapshot {
  timestamp: number;
  dataHash: string;
  sourceFileName: string;
  batchNo: string;
  totalPoints: number;
  validPoints: number;
  missingPoints: string[];
  contaminatedPoints: string[];
  fittingParams: {
    slope: number;
    intercept: number;
    rSquared: number;
    systematicOffset: number;
  };
  statistics: {
    avgErrorBefore: number;
    avgErrorAfter: number;
    passRate: number;
    failCount: number;
  };
  correctedPoints: CorrectedPoint[];
  rawData: MeasurementPoint[];
}

export type AnomalyType = 'missing' | 'contaminated' | 'out_of_tolerance' | 'none';

export interface AnomalyInfo {
  type: AnomalyType;
  severity: 'warning' | 'error' | 'critical';
  message: string;
}
