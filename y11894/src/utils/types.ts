export interface DataPoint {
  x: number;
  y: number;
  isOutlier: boolean;
  residual: number;
  rowIndex: number;
}

export interface FitModel {
  id: string;
  name: string;
  latexFormula: string;
  fn: (params: number[], x: number) => number;
  jacobian: (params: number[], x: number) => number[];
  paramNames: string[];
  defaultInitial: number[];
  paramBounds: { lower: number; upper: number }[];
  description: string;
}

export interface FitResult {
  success: boolean;
  parameters: number[];
  standardErrors: number[];
  confidenceIntervals: [number, number][];
  rSquared: number;
  adjustedRSquared: number;
  rmse: number;
  iterations: number;
  converged: boolean;
  residualHistory: number[];
}

export interface DiagnosisResult {
  divergenceDetected: boolean;
  divergenceReason: string;
  outliers: DataPoint[];
  outlierCount: number;
  totalPoints: number;
  outlierRatio: number;
  outlierWarning: string | null;
  unitAnomaly: string | null;
  summary: string;
  status: 'pass' | 'warning' | 'fail';
}

export interface ResidualAnalysis {
  residuals: number[];
  standardizedResiduals: number[];
  meanResidual: number;
  residualStdDev: number;
  hasPattern: boolean;
  patternDescription: string | null;
}

export interface SampleDataset {
  id: string;
  name: string;
  description: string;
  modelId: string;
  data: { x: number; y: number }[];
  expectedBehavior: string;
  customInitial?: number[];
}
