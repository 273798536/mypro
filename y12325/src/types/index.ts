export interface Point {
  x: number;
  y: number;
}

export interface ColorScheme {
  stroke: string;
  fill: string;
  background: string;
}

export type InitialShape = 'triangle' | 'square' | 'line' | 'koch' | 'cantor' | 'sierpinski';

export type ErrorType = 'explosion' | 'invalid_rule' | 'color_overlap' | 'other';

export type ExperimentStatus = 'idle' | 'running' | 'success' | 'failed';

export interface ExperimentConfig {
  iterationRule: string;
  initialShape: InitialShape;
  colorScheme: ColorScheme;
  maxIterations: number;
  zoomLevel: number;
  note: string;
  scaleFactor?: number;
  angle?: number;
}

export interface IterationResult {
  step: number;
  points: Point[];
  dimension: number;
  imageData?: string;
  lineSegments?: Array<{ start: Point; end: Point }>;
}

export interface Experiment {
  id: string;
  name: string;
  config: ExperimentConfig;
  status: ExperimentStatus;
  errorType?: ErrorType;
  errorMessage?: string;
  results: IterationResult[];
  fractalDimension?: number;
  createdAt: Date;
  updatedAt: Date;
  sourceId?: string;
}

export interface BatchJob {
  id: string;
  name: string;
  experiments: Experiment[];
  status: 'pending' | 'running' | 'completed';
  progress: number;
}

export interface ValidationResult {
  valid: boolean;
  errorType?: ErrorType;
  message?: string;
}

export interface SampleData {
  id: string;
  name: string;
  description: string;
  category: 'normal' | 'explosion' | 'invalid_rule' | 'color_overlap';
  config: ExperimentConfig;
  expectedError?: ErrorType;
  expectedMessage?: string;
}

export type ExportFormat = 'json' | 'png' | 'pdf';

export interface ExportRecord {
  id: string;
  experimentId: string;
  format: ExportFormat;
  filePath: string;
  exportedAt: Date;
}
