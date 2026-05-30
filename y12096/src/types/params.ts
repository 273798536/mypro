export type RotationAxis = 'x' | 'y' | 'custom';

export type CalculationMethod = 'disk' | 'shell';

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'needs_review';

export type ValidationIssueType = 'interval_reversed' | 'axis_ambiguous' | 'slice_insufficient';

export interface ValidationIssue {
  type: ValidationIssueType;
  severity: 'warning' | 'error';
  message: string;
  nextAction: string;
  autoReview: boolean;
  reviewer?: string;
}

export interface ValidationResult {
  issues: ValidationIssue[];
  requiresReview: boolean;
}

export interface ValidationState {
  isIntervalReversed: boolean;
  isAxisAmbiguous: boolean;
  isSliceInsufficient: boolean;
  reviewStatus: ReviewStatus;
  assignedReviewer: string | null;
  issues: ValidationIssue[];
}

export interface ParamState {
  functionExpr: string;
  rotationAxis: RotationAxis;
  axisOffset: number;
  intervalA: number;
  intervalB: number;
  sliceCount: number;
  showSlices: boolean;
  method: CalculationMethod;
  validation: ValidationState;
}

export interface CalculationStep {
  description: string;
  formula: string;
  value?: number;
}

export interface CalculationResult {
  volume: number;
  method: CalculationMethod;
  steps: CalculationStep[];
  sliceAreas: number[];
}

export interface SavedView {
  id: string;
  name: string;
  position: [number, number, number];
  target: [number, number, number];
  createdAt: string;
}

export const REVIEWERS = [
  { id: 'li', name: '李老师', role: '教研组长', specialty: '区间反向核对' },
  { id: 'wang', name: '王教授', role: '数学系教授', specialty: '轴线混淆确认' },
  { id: 'zhang', name: '张实验员', role: '实验室管理员', specialty: '切片数量建议' },
] as const;
