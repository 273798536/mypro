export type BoundaryType = "empty" | "zero_division" | "bad_data" | null;

export interface Material {
  id: string;
  name: string;
  length: number | null;
  width: number | null;
  height: number | null;
  quantity: number | null;
  realVolume: number | null;
  approxVolume?: number;
  errorRate?: number;
  isBoundary: boolean;
  boundaryType: BoundaryType;
  hasDraftGap: boolean;
  gapField?: string;
}

export interface CalculationStep {
  label: string;
  value: number | string;
  note?: string;
}

export interface CalculationResult {
  approxVolume: number;
  errorRate: number | null;
  steps: CalculationStep[];
  hasGap: boolean;
  gapField?: string;
  anomalyType?: string;
  anomalyMessage?: string;
}

export interface Anomaly {
  id: string;
  materialId: string;
  type: "large_error" | "bad_data" | "zero_division" | "empty_set" | "draft_gap";
  humanMessage: string;
  detail: string;
  suggestion: string;
  severity: 1 | 2 | 3;
}

export interface DraftGap {
  id: string;
  materialId: string;
  missingField: string;
  impactDescription: string;
}

export interface ConstraintResult {
  id: string;
  constraintName: string;
  passed: boolean;
  value: number;
  threshold: number;
  unit?: string;
}

export interface BatchParams {
  fillRate: number;
  boxVolume: number;
  roundingRule: "ceil" | "floor" | "round";
  errorThreshold: number;
  transportQuota: number;
}

export interface Batch {
  id: string;
  name: string;
  createdAt: string;
  params: BatchParams;
  materials: Material[];
  totalApproxVolume?: number;
  anomalies?: Anomaly[];
  draftGaps?: DraftGap[];
  constraints?: ConstraintResult[];
}

export interface HistoryDiff {
  constraintName: string;
  oldPassed: boolean;
  newPassed: boolean;
  oldValue: number;
  newValue: number;
  changed: boolean;
}
