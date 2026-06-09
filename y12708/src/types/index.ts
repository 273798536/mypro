export type ProblemType = "unit_missing" | "empty_value" | "duplicate" | "note_mixed" | "none";

export type RecordStatus = "pending" | "confirmed" | "failed" | "archived";

export type ConflictResolution = "keep_new" | "keep_old" | "manual";

export interface Unit {
  name: string;
  symbol: string;
  category: "weight" | "volume" | "count" | "energy" | "ratio";
  conversionFactor?: number;
}

export interface IngredientNutrition {
  protein?: number;
  fat?: number;
  carbohydrate?: number;
  calories?: number;
  fiber?: number;
}

export interface IngredientRecord {
  id: string;
  questionId?: string;
  name: string;
  quantity?: number;
  unit?: string;
  nutrition?: IngredientNutrition;
  category?: string;
  rawNote?: string;
  extractedNote?: string;
  problems: ProblemType[];
  status: RecordStatus;
  batchId?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  isDirty?: boolean;
}

export interface CalculationConstraint {
  type: "min" | "max" | "exact";
  field: keyof IngredientNutrition | "total_cost" | "total_quantity";
  value: number;
  unit: string;
}

export interface CalculationResult {
  id: string;
  recordId: string;
  success: boolean;
  value?: number;
  unit?: string;
  breakdown?: {
    label: string;
    value: number;
    unit: string;
  }[];
  failureReason?: string;
  suggestion?: string;
  constraints?: CalculationConstraint[];
  calculatedAt: string;
  calculatedBy: string;
}

export interface AuditChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface AuditLog {
  id: string;
  recordId: string;
  operator: string;
  action: "create" | "update" | "confirm" | "reject" | "delete" | "import";
  changes: AuditChange[];
  note?: string;
  timestamp: string;
}

export interface ImportBatch {
  id: string;
  name: string;
  fileName: string;
  importedAt: string;
  importedBy: string;
  totalRecords: number;
  cleanRecords: number;
  problemRecords: number;
  status: "draft" | "processing" | "completed";
  recordIds: string[];
  parentBatchId?: string;
}

export interface VersionDiff {
  recordId: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  diffType: "added" | "removed" | "changed" | "unchanged";
}

export interface VersionConflict {
  recordId: string;
  oldVersion: IngredientRecord;
  newVersion: IngredientRecord;
  diffs: VersionDiff[];
  resolution?: ConflictResolution;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface FormulaInfo {
  name: string;
  latex: string;
  description: string;
  units: { name: string; symbol: string; description: string }[];
  scope: string[];
  constraints: string[];
}

export interface LPModelConfig {
  objective: "minimize_cost" | "maximize_nutrition" | "balance_nutrition";
  variables: {
    recordId: string;
    name: string;
    coefficient: number;
    lowerBound?: number;
    upperBound?: number;
  }[];
  constraints: CalculationConstraint[];
}

export type TabKey = "all" | ProblemType;
