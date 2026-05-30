export interface SamplingPoint {
  x: number;
  y: number;
  duplicate?: boolean;
}

export type FunctionType = 'runge' | 'sin' | 'exp' | 'custom';

export interface NoiseConfig {
  type: 'gaussian' | 'uniform';
  amplitude: number;
  seed: number;
}

export interface ErrorPoint {
  x: number;
  error: number;
}

export interface Warning {
  type: 'duplicate_x' | 'boundary_oscillation' | 'noise_amplification';
  message: string;
  severity: 'error' | 'warning';
}

export interface InterpolationResult {
  points: SamplingPoint[];
  evaluatedCurve: { x: number; y: number }[];
  errorCurve: ErrorPoint[];
  maxError: number;
  rmse: number;
  warnings: Warning[];
}

export interface ExperimentSnapshot {
  id: string;
  timestamp: number;
  functionType: FunctionType;
  noiseConfig: NoiseConfig | null;
  result: InterpolationResult;
  label: string;
}

export type ImportPhase = 1 | 2;

export type ExampleType = 'duplicate_x' | 'boundary_oscillation' | 'noise_amplification';

export interface Viewport {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}
