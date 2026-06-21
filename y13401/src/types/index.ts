export type ValueType = "normal" | "empty_set" | "zero" | "null" | "undefined";

export type ParameterStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "needs_review"
  | "duplicate";

export type OperationType =
  | "create"
  | "update"
  | "supplement"
  | "withdraw"
  | "rejudge"
  | "approve"
  | "reject";

export type BatchResultType = "new" | "skipped" | "updated" | "error";

export interface BoundaryConditions {
  min?: number;
  max?: number;
  mustBeInteger?: boolean;
  mustBePositive?: boolean;
  mustBeNonNegative?: boolean;
  notes?: string;
}

export interface Parameter {
  id: string;
  name: string;
  unit: string;
  formula: string;
  formulaExplanation: string;
  description: string;
  value: number | null;
  valueType: ValueType;
  status: ParameterStatus;
  boundaryConditions: BoundaryConditions;
  category: string;
  createdAt: string;
  updatedAt: string;
  duplicateOf?: string;
}

export interface TimelineEntry {
  id: string;
  parameterId: string;
  parameterName: string;
  operationType: OperationType;
  oldValue?: number | null;
  newValue?: number | null;
  oldStatus?: ParameterStatus;
  newStatus?: ParameterStatus;
  reason: string;
  operator: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface Batch {
  id: string;
  name: string;
  runAt: string;
  totalCount: number;
  newCount: number;
  skippedCount: number;
  updatedCount: number;
  errorCount: number;
  previousBatchId?: string;
}

export interface BatchResultItem {
  id: string;
  batchId: string;
  parameterId: string;
  parameterName: string;
  resultType: BatchResultType;
  reason: string;
  previousValue?: number | null;
  currentValue?: number | null;
  previousValueType?: ValueType;
  currentValueType?: ValueType;
}

export interface BatchRunInput {
  parameters: Omit<Parameter, "id" | "createdAt" | "updatedAt" | "status">[];
  batchName: string;
}
