export type UnitType = "meter" | "feet" | "lumen" | "candela" | "kelvin";

export interface DeviceCoord {
  fixtureId: string;
  x: number;
  y: number;
  z: number;
  unit: UnitType;
}

export interface UnitError {
  field: string;
  originalValue: number;
  originalUnit: UnitType;
  expectedUnit: UnitType;
  correctedValue: number | null;
  message: string;
}

export interface RiskNote {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  linkedConclusionId: string | null;
}

export interface Conclusion {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
  linkedRiskNoteId: string | null;
}

export interface TraceNode {
  id: string;
  type: "source" | "process" | "result";
  title: string;
  description: string;
  timestamp: string;
  operator: string;
  metadata: Record<string, any>;
}

export type RecordStatus = "draft" | "reviewing" | "corrected" | "finalized";

export interface LightRecord {
  id: string;
  batchNo: string;
  fixtureName: string;
  coords: DeviceCoord;
  unitErrors: UnitError[];
  riskNotes: RiskNote[];
  conclusions: Conclusion[];
  traceChain: TraceNode[];
  hasDuplicate: boolean;
  duplicateOf: string | null;
  status: RecordStatus;
  createdAt: string;
  updatedAt: string;
  operator: string;
  isTransparentOcclusionMisread: boolean;
}

export interface HistoryEntry {
  version: number;
  timestamp: string;
  operator: string;
  changes: Partial<LightRecord>;
  diff: string;
}

export interface ImportResult {
  success: boolean;
  record?: LightRecord;
  isDuplicate?: boolean;
  existingRecordId?: string;
  message?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface RecordFilter {
  hasUnitErrors?: boolean;
  hasRiskNotes?: boolean;
  hasDuplicate?: boolean;
  isTransparentOcclusionMisread?: boolean;
  status?: RecordStatus;
  batchNo?: string;
}
