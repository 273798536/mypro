export interface Cage {
  id: string;
  cageNumber: string;
  location: string;
  strain: string;
  totalMice: number;
  createdAt: string;
  updatedAt: string;
}

export interface Sample {
  id: string;
  barcode: string;
  cageId: string;
  sampleType: string;
  collectionDate: string;
  collector: string;
  status: 'pending' | 'testing' | 'completed' | 'failed';
  remark: string;
  createdAt: string;
}

export interface ReagentBatch {
  id: string;
  batchNumber: string;
  reagentName: string;
  manufactureDate: string;
  expiryDate: string;
  supplier: string;
  isActive: boolean;
}

export interface QcResult {
  id: string;
  sampleId: string;
  reagentBatchId: string | null;
  runBatchId: string;
  testItem: string;
  resultValue: number | null;
  unit: string;
  resultStatus: 'normal' | 'warning' | 'abnormal' | 'pending' | 'failed';
  formula: string;
  testedAt: string;
  referenceRange?: {
    min: number;
    max: number;
  };
  failureReason?: string;
}

export type AnomalyCategory = 'supplement' | 'recalibration';
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';
export type AnomalyStatus = 'pending' | 'processing' | 'resolved';

export interface Anomaly {
  id: string;
  sampleId: string | null;
  runBatchId: string;
  type: string;
  severity: AnomalySeverity;
  category: AnomalyCategory;
  description: string;
  suggestion: string;
  status: AnomalyStatus;
  createdAt: string;
  resolvedAt: string | null;
  affectedSamples: string[];
  formulaRef?: string;
}

export interface RunBatch {
  id: string;
  batchNumber: string;
  name: string;
  runAt: string;
  operator: string;
  sampleCount: number;
  anomalyCount: number;
  status: 'running' | 'completed' | 'failed';
}

export interface FormulaParameter {
  name: string;
  label: string;
  unit: string;
  type: 'number' | 'string' | 'date';
  required: boolean;
  defaultValue?: number | string;
  min?: number;
  max?: number;
}

export interface Formula {
  id: string;
  name: string;
  code: string;
  description: string;
  expression: string;
  unit: string;
  applicableScope: string;
  failureConditions: string[];
  parameters: FormulaParameter[];
  referenceRange?: {
    min: number;
    max: number;
  };
  category: string;
}

export interface CalculationResult {
  success: boolean;
  value: number | null;
  unit: string;
  status: 'normal' | 'warning' | 'abnormal' | 'failed';
  failureReason?: string;
  formula: string;
  steps: CalculationStep[];
}

export interface CalculationStep {
  name: string;
  expression: string;
  result: number;
  description: string;
}

export interface DuplicateBarcodeInfo {
  barcode: string;
  count: number;
  samples: Sample[];
  firstCreatedAt: string;
  lastCreatedAt: string;
}

export interface ExportOptions {
  format: 'csv' | 'html';
  includeSamples: boolean;
  includeQcResults: boolean;
  includeAnomalies: boolean;
  includeFormulas: boolean;
  runBatchId?: string;
}
