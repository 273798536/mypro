export interface Vector2D {
  x: number;
  y: number;
}

export interface VectorFieldPoint {
  position: Vector2D;
  vector: Vector2D;
}

export interface VectorField {
  id: string;
  name: string;
  description: string;
  formula: string;
  formulaLatex: string;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  gridStep: number;
  computeVector: (x: number, y: number) => Vector2D;
  isConservative: boolean;
  hasSingularity?: boolean;
  singularityPoints?: Vector2D[];
  requiredFields: string[];
  validationErrors?: string[];
}

export interface PathNode {
  id: string;
  position: Vector2D;
  isControlPoint?: boolean;
}

export interface Path {
  id: string;
  name: string;
  color: string;
  nodes: PathNode[];
  isClosed: boolean;
  direction: 1 | -1;
  sampleStep: number;
  createdAt: number;
  updatedAt: number;
}

export interface PathValidation {
  isValid: boolean;
  nodeCount: number;
  hasSelfIntersection: boolean;
  intersectionPoints?: Vector2D[];
  isOutOfBounds: boolean;
  outOfBoundsPoints?: Vector2D[];
  stepSizeWarning: boolean;
  recommendedStep: number;
  directionWarnings?: string[];
  suggestions: string[];
}

export interface IntegrationBreakdown {
  position: Vector2D;
  vector: Vector2D;
  tangent: Vector2D;
  dotProduct: number;
  contribution: number;
}

export interface IntegrationResult {
  pathId: string;
  vectorFieldId: string;
  value: number;
  numericalError: number;
  convergenceRate: number;
  sampleCount: number;
  computationTime: number;
  stepSize: number;
  directionFactor: number;
  breakdown: IntegrationBreakdown[];
  timestamp: number;
  method: 'trapezoidal' | 'simpson';
}

export interface ComparisonReport {
  id: string;
  fieldId: string;
  pathAResult: IntegrationResult;
  pathBResult: IntegrationResult;
  difference: number;
  percentageDiff: number;
  analysisNotes: string[];
  warnings: string[];
  createdAt: number;
  exportedAt?: number;
}

export interface Warning {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  details?: string;
  timestamp: number;
}

export interface AppSettings {
  stepSize: number;
  integrationMethod: 'trapezoidal' | 'simpson';
  showVectors: boolean;
  showGrid: boolean;
  theme: 'light' | 'dark';
  animationSpeed: number;
}

export interface AppState {
  vectorFields: VectorField[];
  activeFieldId: string | null;
  paths: Path[];
  activePathId: string | null;
  selectedPathForDrawing: 'A' | 'B' | null;
  results: IntegrationResult[];
  reports: ComparisonReport[];
  warnings: Warning[];
  settings: AppSettings;
  isDrawing: boolean;
  showFormulaPanel: boolean;
}
