export interface FieldMapping {
  id: string;
  sourceFieldName: string;
  targetFieldName: string;
  fieldSource: 'auto-detected' | 'manual-mapped' | 'inherited';
  processStatus: 'pending' | 'processed' | 'locked';
  matchConfidence: number;
}

export interface DirectionCheckResult {
  hasAnomaly: boolean;
  anomalousFields: string[];
  detectedValues: Record<string, number>;
  expectedDirection: 'positive' | 'negative';
}

export interface ExperimentRecord {
  id: string;
  sourceFileName: string;
  experimentName?: string;
  rawData: Record<string, any>;
  mappedData: Record<string, any>;
  importTimestamp: number;
  importedAt: number;
  importedBy: string;
  maintenanceRemark?: string;
  fieldMappings: FieldMapping[];
  directionSignCheck: DirectionCheckResult;
}

export interface CalculationParameters {
  airDensity: number;
  windSpeed: number;
  angleOfAttack: number;
  smokeLineDiameter: number;
  turbulenceIntensity: number;
  parameterLevel: 'level1' | 'level2' | 'level3' | 'custom';
}

export interface CalculationOutput {
  liftCoefficient: number;
  dragCoefficient: number;
  pressureDistribution: number[];
  flowVelocity: number;
  reynoldsNumber: number;
  smokeLineTrajectory: { x: number; y: number }[];
}

export interface FormulaInfo {
  expression: string;
  variables: Record<string, { value: number; unit: string; description: string }>;
  unit: string;
  description: string;
}

export interface BoundarySample {
  id: string;
  name: string;
  parameter: keyof CalculationParameters;
  value: number;
  result: number;
  deviationFromBase: number;
}

export type SensitivityReport = Record<string, number>;

export interface BoundarySampleAnalysis {
  samples: BoundarySample[];
  sensitivityReport: string;
  impactFactors: { factor: string; impact: 'high' | 'medium' | 'low'; change: string }[];
  minValue?: number;
  normalValue?: number;
  maxValue?: number;
  minImpact?: number;
  maxImpact?: number;
}

export interface Annotation {
  sceneNote: string;
  sideNote: string;
  screenshotNote: string;
  lastSyncedAt: number;
  syncMode: 'independent' | 'synchronized';
}

export type OperationType = 'import' | 'create' | 'update' | 'delete' | 'calculate' | 'calculation' | 'annotate' | 'annotation' | 'suspend' | 'confirm' | 'reject' | 'export' | 'parameter_change';

export interface OperationLog {
  id: string;
  resultId: string;
  operator: string;
  operationType: OperationType;
  beforeSnapshot: any;
  afterSnapshot: any;
  timestamp: number;
  remark: string;
}

export type SuspendReason = 'direction_sign_reversed' | 'boundary_anomaly' | 'manual_suspend';
export type SuspendStatus = 'pending' | 'corrected' | 'approved' | 'rejected';

export interface SuspendRecord {
  id: string;
  resultId: string;
  reason: SuspendReason;
  description: string;
  originalValue: any;
  suggestedValue?: any;
  status: SuspendStatus;
  confirmUser?: string;
  confirmTime?: number;
  confirmRemark?: string;
}

export type ResultStatus = 'normal' | 'suspended' | 'confirmed' | 'rejected';

export interface CalculationResult {
  id: string;
  recordId: string;
  experimentRecordId: string;
  version: number;
  parameters: CalculationParameters;
  result: CalculationOutput;
  formula: FormulaInfo;
  boundaryAnalysis: BoundarySampleAnalysis;
  status: ResultStatus;
  annotations: Annotation;
  parameterGear: number | string;
  calculatedAt: number;
  createdAt: number;
  createdBy: string;
  updatedAt: number;
  liftCoefficient?: number;
  dragCoefficient?: number;
  reynoldsNumber?: number;
}

export interface ParsedFileData {
  headers: string[];
  rows: Record<string, any>[];
  fileName: string;
}
