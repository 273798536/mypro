export interface AffineTransform {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
  probability: number;
}

export interface ColorScheme {
  mode: "layer" | "gradient" | "fixed";
  colors: string[];
  layerOpacity: number;
}

export interface IterationRule {
  id: string;
  name: string;
  transforms: AffineTransform[];
  colorScheme: ColorScheme;
  maxIterations: number;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface InitialShape {
  id: string;
  name: string;
  type: "polygon" | "line" | "point" | "custom";
  vertices: [number, number][];
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface ValidationResult {
  id: string;
  type: "iteration_explosion" | "rule_illegal" | "color_overlap";
  severity: "error" | "warning";
  message: string;
  sourceRecordId: string;
  sourceFieldName: string;
  details: Record<string, unknown>;
  detectedAt: number;
}

export interface AuditEntry {
  id: string;
  targetRecordId: string;
  targetFieldName: string;
  oldValue: unknown;
  newValue: unknown;
  operator: string;
  reason: string;
  relatedValidationId?: string;
  timestamp: number;
}

export interface ParamGuardRule {
  paramPath: string;
  min?: number;
  max?: number;
  pattern?: string;
  description: string;
  source: string;
}

export interface ConflictEntry {
  field: string;
  ruleValue: unknown;
  shapeValue: unknown;
  source: "iteration_rule" | "initial_shape";
  resolved: boolean;
  resolution?: "rule" | "shape";
}

export interface DimensionInfo {
  hausdorff: number;
  boxCount: number;
  method: string;
}

export interface ReportData {
  canvasSnapshot: string;
  parameterSnapshot: {
    rule: IterationRule | null;
    shape: InitialShape | null;
    iterationCount: number;
  };
  dimensionInfo: DimensionInfo;
  validations: ValidationResult[];
  auditSummary: AuditEntry[];
  paramGuardNotes: string[];
  generatedAt: number;
}
