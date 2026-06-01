export enum AnomalyType {
  SENSOR_DRIFT = 'SENSOR_DRIFT',
  EMISSIVITY_MISSING = 'EMISSIVITY_MISSING',
  BATCH_MISMATCH = 'BATCH_MISMATCH',
  FIELD_MISSING = 'FIELD_MISSING',
}

export enum AnomalyLevel {
  CRITICAL = 'CRITICAL',
  WARNING = 'WARNING',
  INFO = 'INFO',
}

export interface MaterialBatch {
  id: string;
  batchNo: string;
  materialType: string;
  defaultEmissivity: number;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RadiationReading {
  id: string;
  sensorId: string;
  readingTime: Date;
  radiationValue: number;
  materialBatchId: string;
  emissivity: number | null;
  ambientTemp: number;
  isLateSupplement: boolean;
  remark: string;
  remarkModifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EstimationResult {
  id: string;
  readingId: string;
  estimatedTemp: number;
  calculationFormula: string;
  calculationParams: Record<string, number>;
  runId: string;
  isIsolated: boolean;
  anomalyType: AnomalyType | null;
  createdAt: Date;
}

export interface AnomalyRecord {
  id: string;
  readingId: string;
  resultId: string;
  type: AnomalyType;
  level: AnomalyLevel;
  description: string;
  detectedAt: Date;
  isReviewed: boolean;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewRemark: string | null;
}

export interface AuditTrail {
  id: string;
  entityType: 'reading' | 'batch' | 'config' | 'result';
  entityId: string;
  fieldName: string;
  oldValue: any;
  newValue: any;
  modifiedBy: string;
  modifiedAt: Date;
  reason: string;
  relatedRunId: string | null;
}

export interface SystemConfig {
  id: string;
  configKey: string;
  configValue: number | string | boolean;
  description: string;
  isModified: boolean;
  modifiedAt: Date | null;
  modifiedBy: string | null;
}

export interface EstimationRun {
  id: string;
  runName: string;
  startTime: Date;
  endTime: Date;
  recordCount: number;
  anomalyCount: number;
  parameters: Record<string, any>;
  baseRunId: string | null;
  remark: string;
}

export interface FilterCondition {
  startTime: Date | null;
  endTime: Date | null;
  batchIds: string[];
  sensorIds: string[];
  anomalyTypes: AnomalyType[];
  showIsolated: boolean;
}

export interface ComparisonResult {
  readingId: string;
  oldTemp: number;
  newTemp: number;
  diff: number;
  isSignificant: boolean;
  batchId: string;
  batchNo: string;
}

export interface ComparisonSummary {
  totalRecords: number;
  diffRecords: number;
  maxDiff: number;
  avgDiff: number;
  affectedBatches: string[];
  details: ComparisonResult[];
}
