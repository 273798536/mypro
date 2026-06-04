export interface Level {
  id: string;
  name: string;
  description: string;
  status: "draft" | "review" | "confirmed";
  gridWidth: number;
  gridHeight: number;
  cellSize: number;
  snapEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RuleConfig {
  id: string;
  levelId: string;
  ruleType: string;
  colorRangeMin: string;
  colorRangeMax: string;
  colorRangeName: string;
  parameters: Record<string, unknown>;
  createdAt: string;
}

export interface ColorViolation {
  id: string;
  levelId: string;
  ruleConfigId: string;
  violationType: string;
  description: string;
  affectedConclusionIds: string[];
  status: "open" | "fixed" | "suppressed";
  createdAt: string;
}

export interface Conclusion {
  id: string;
  levelId: string;
  content: string;
  sourceDraftIds: string[];
  status: "pending" | "confirmed" | "rejected";
  dedupHash: string;
  createdAt: string;
}

export interface AnnotationDraft {
  id: string;
  levelId: string;
  name: string;
  content: string;
  status: "missing" | "partial" | "complete";
  linkedConclusionIds: string[];
  createdAt: string;
}

export interface ChangeHistory {
  id: string;
  entityType: "level" | "violation" | "conclusion" | "draft";
  entityId: string;
  action: "create" | "update" | "delete" | "merge";
  beforeData: Record<string, unknown> | null;
  afterData: Record<string, unknown> | null;
  description: string;
  createdAt: string;
}

export interface ErrorResponse {
  code: string;
  message: string;
  actionableHint: string;
  missingDraftNames?: string[];
}

export interface DedupGroup {
  canonicalId: string;
  duplicateIds: string[];
  content: string;
}

export interface DedupResult {
  hasDuplicates: boolean;
  groups: DedupGroup[];
}

export interface ConsistencyDifference {
  field: string;
  uiValue: string;
  exportValue: string;
  conclusionId: string;
}

export interface ConsistencyReport {
  isConsistent: boolean;
  differences: ConsistencyDifference[];
}

export type LevelStatus = Level["status"];
export type ViolationStatus = ColorViolation["status"];
export type ConclusionStatus = Conclusion["status"];
export type DraftStatus = AnnotationDraft["status"];
