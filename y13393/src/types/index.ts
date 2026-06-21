export interface CostSnapshot {
  id: string;
  version: string;
  modelVersion: string;
  createdAt: string;
  operator: string;
  totalCost: number;
  status: 'normal' | 'warning' | 'error';
  parameters: Parameter[];
  notes: Note[];
  screenshots: Screenshot[];
  manualJudgment?: ManualJudgment;
}

export interface Parameter {
  id: string;
  name: string;
  formula: string;
  unit: string;
  value: number;
  minBoundary: number;
  maxBoundary: number;
  source: string;
  description: string;
}

export interface Note {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  isSupplement: boolean;
}

export interface Screenshot {
  id: string;
  url: string;
  description: string;
  createdAt: string;
}

export interface ManualJudgment {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  decision: 'approve' | 'reject' | 'pending';
}

export interface Exception {
  id: string;
  type: 'grayscale_ratio' | 'parameter_out_of_bound' | 'formula_mismatch';
  parameterName: string;
  currentValue: number;
  expectedValue: number;
  impact: string;
  steps: string[];
  status: 'open' | 'in_progress' | 'resolved';
}

export interface ReviewItem {
  id: string;
  snapshotId: string;
  material: string;
  isComplete: boolean;
  action: 'supplement' | 'release';
  remark: string;
}

export interface ParameterDiff {
  name: string;
  valueA: number;
  valueB: number;
  diff: number;
  diffPercent: number;
  unit: string;
}

export interface ComparisonResult {
  totalCostDiff: number;
  totalCostDiffPercent: number;
  parameterDiffs: ParameterDiff[];
  hasManualJudgmentChange: boolean;
}

export type ExportFormat = 'csv' | 'excel' | 'json';
