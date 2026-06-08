export type RecordStatus = "normal" | "anomaly" | "corrected" | "pending";

export type AnomalyType =
  | "TIME_MISMATCH"
  | "RISK_NOTE_MISSING"
  | "TRANSPARENT_OCCLUSION"
  | "PARAM_OUT_OF_RANGE"
  | "DATA_FORMAT_ERROR";

export interface CrossSectionPoint {
  x: number;
  y: number;
  z: number;
}

export interface CrossSectionAnnotation {
  position: { x: number; y: number; z: number };
  text: string;
}

export interface CrossSectionData {
  points: CrossSectionPoint[];
  parameters: {
    depth: number;
    width: number;
    height: number;
  };
  annotations: CrossSectionAnnotation[];
  isComplete: boolean;
}

export interface AnomalyDetail {
  type: AnomalyType;
  name: string;
  description: string;
  icon: string;
  color: string;
  impact: string;
  nextActionType: "material" | "calibrate";
  suggestions: Array<{
    action: string;
    description: string;
  }>;
  blockingReason: string;
}

export interface Record {
  id: string;
  recordNumber: string;
  timeParameter: string;
  riskNote: string;
  status: RecordStatus;
  anomalyType?: AnomalyType;
  anomalyDescription?: string;
  anomalySuggestion?: string;
  ropeAngle: number;
  ropeLength: number;
  ropeTension: number;
  anchorPointA: { x: number; y: number; z: number };
  anchorPointB: { x: number; y: number; z: number };
  crossSectionData: CrossSectionData;
  createdAt: string;
  updatedAt: string;
  operator: string;
}

export interface HistoryChange {
  field: string;
  fieldLabel: string;
  oldValue: string | number | boolean | null;
  newValue: string | number | boolean | null;
}

export interface RecordHistory {
  id: string;
  recordId: string;
  version: number;
  changes: HistoryChange[];
  operator: string;
  operatedAt: string;
  comment?: string;
}

export interface RecordSnapshot {
  record: Record;
  historyIndex: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ListQueryParams {
  page?: number;
  pageSize?: number;
  status?: RecordStatus;
  anomalyType?: AnomalyType;
  keyword?: string;
  startDate?: string;
  endDate?: string;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  statistics: {
    totalRecords: number;
    anomalyCount: number;
    correctedCount: number;
    pendingCount: number;
    normalCount: number;
  };
}

export type ExportFormat = "csv" | "json" | "markdown";

export interface ExportConfig {
  format: ExportFormat;
  recordIds?: string[];
  dateRange?: { start: string; end: string };
  includeHistory: boolean;
  includeCharts: boolean;
}
