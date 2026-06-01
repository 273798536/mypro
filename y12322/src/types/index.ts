export type WarningType = 'singularity' | 'reversed_interval' | 'oversized_step';

export type WarningSeverity = 'warning' | 'error';

export type IntegrationMethod = 'trapezoidal' | 'simpson';

export type MaterialSource = 'manual' | 'import';

export interface BoundaryWarning {
  id: string;
  type: WarningType;
  severity: WarningSeverity;
  message: string;
  position?: number;
}

export interface RawMaterial {
  id: string;
  expression: string;
  stepSize: number;
  intervalA: number;
  intervalB: number;
  notes: string;
  source: MaterialSource;
  createdAt: number;
}

export interface ProcessedResult {
  id: string;
  materialId: string;
  method: IntegrationMethod;
  result: number;
  errorEstimate: number;
  warnings: BoundaryWarning[];
  computedAt: number;
}

export interface ChartDataPoint {
  x: number;
  y: number;
  trapezoidY?: number;
  simpsonY?: number;
}

export interface IntegrationInput {
  expression: string;
  stepSize: number;
  intervalA: number;
  intervalB: number;
  method: IntegrationMethod;
}
