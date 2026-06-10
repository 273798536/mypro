export type UserRole = "engineer" | "supervisor";

export type RecordStatus = "success" | "pending" | "bad";

export type TraceActionType =
  | "create"
  | "update"
  | "delete"
  | "import"
  | "review"
  | "approve"
  | "reject"
  | "export";

export interface WeighingRow {
  id: string;
  index: number;
  sampleName: string;
  sampleCode: string;
  weightMg: number;
  purity: number;
  moles: number;
  isStandard: boolean;
  note?: string;
}

export interface Peak {
  id: string;
  retentionTime: number;
  area: number;
  height: number;
  width: number;
  asymmetry: number;
  startX: number;
  endX: number;
  baselineY: number;
  peakName?: string;
  isBaselineDrift?: boolean;
  isNoise?: boolean;
}

export interface OverlapRegion {
  id: string;
  peakIds: [string, string];
  overlapRatio: number;
  severity: "low" | "medium" | "high";
  suggestedSeparation: string;
}

export interface WeighingRecord {
  id: string;
  batchNo: string;
  sampleName: string;
  fileName: string;
  importTime: string;
  operator: string;
  status: RecordStatus;
  totalRows: number;
  totalWeightMg: number;
  rows: WeighingRow[];
  rawCsvContent?: string;
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface PeakAnalysisResult {
  id: string;
  recordId: string;
  chartPath: string;
  peaks: Peak[];
  overlapRegions: OverlapRegion[];
  baselineDriftDetected: boolean;
  noiseLevel: "low" | "medium" | "high";
  analysisTime: string;
  status: RecordStatus;
}

export interface BalanceCalcResult {
  id: string;
  recordId: string;
  analysisId: string;
  standardPeakId: string;
  targetPeakId: string;
  standardWeightMg: number;
  standardPurity: number;
  targetArea: number;
  standardArea: number;
  calculatedWeightMg: number;
  calculatedPurity: number;
  calcTime: string;
  operator: string;
  status: RecordStatus;
}

export interface TraceLog {
  id: string;
  timestamp: string;
  operator: string;
  operatorRole: UserRole;
  action: TraceActionType;
  targetType: "record" | "analysis" | "balance" | "report";
  targetId: string;
  targetName: string;
  detail: string;
  ipAddress?: string;
}

export interface ReportPreview {
  id: string;
  recordId: string;
  title: string;
  generatedAt: string;
  generatedBy: string;
  format: "pdf" | "excel";
  summary: {
    totalSamples: number;
    analyzedPeaks: number;
    normalCount: number;
    pendingCount: number;
    abnormalCount: number;
  };
  charts: string[];
  downloadUrl?: string;
}

export interface NotificationItem {
  id: string;
  type: "success" | "warning" | "error" | "info";
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
  timestamp: string;
  read: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    suggestion?: string;
    actionHref?: string;
    actionLabel?: string;
  };
  timestamp: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
