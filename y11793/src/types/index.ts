export interface RCParams {
  ocv: number;
  R0: number;
  R1: number;
  C1: number;
}

export interface ParameterBounds {
  ocv: [number, number];
  R0: [number, number];
  R1: [number, number];
  C1: [number, number];
}

export interface LMFitOptions {
  maxIterations?: number;
  tolerance?: number;
  lambda?: number;
  lambdaMultiplier?: number;
  divergenceThreshold?: number;
}

export interface Alert {
  id: string;
  category: 'sampling_gap' | 'temperature_drift' | 'parameter_divergence';
  severity: 'warning' | 'severe' | 'fatal';
  message: string;
  timestamp: number;
  resolved: boolean;
}

export interface CorrectionTraceRecord {
  id: string;
  field: string;
  beforeValue: string;
  afterValue: string;
  reason: string;
  timestamp: number;
}

export interface ResidualStats {
  mean: number;
  stdDev: number;
  max: number;
  min: number;
}

export interface SamplingGapResult {
  alerts: Alert[];
  filledTimes: number[];
  filledIndices: number[];
}

export interface TemperatureDriftResult {
  alerts: Alert[];
  driftRegions: Array<{ startIndex: number; endIndex: number; driftRate: number }>;
}

export interface FittingResult {
  fittedParams: RCParams;
  residuals: number[];
  rSquared: number;
  rmse: number;
  iterations: number;
  converged: boolean;
  alerts: Alert[];
}

export interface ParameterBoundCheckResult {
  params: RCParams;
  bounds: ParameterBounds;
  violations: Array<{ param: keyof RCParams; value: number; lower: number; upper: number }>;
  allWithinBounds: boolean;
}

export type CorrectionTrace = (field: string, beforeValue: string, afterValue: string, reason: string) => CorrectionTraceRecord;
