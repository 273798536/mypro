export type ProcessingStatus =
  | "pending"
  | "verified"
  | "warning"
  | "error"
  | "re_run";

export type ChangeSource = "unit" | "parameter" | "sample" | "unknown";

export interface Attachment {
  id: string;
  name: string;
  receivedAt: string;
  type: "parameter" | "screenshot" | "supplement" | "late";
  note?: string;
}

export interface ScreenshotRef {
  id: string;
  name: string;
  timestamp: string;
  description: string;
}

export interface RunHistory {
  runId: string;
  runAt: string;
  operator: string;
  status: ProcessingStatus;
  note: string;
  screenshots: ScreenshotRef[];
  diffSummary?: string;
}

export interface TopologyRecord {
  id: string;
  sampleNo: string;
  declaredSampleNo: string;
  pathCode: string;
  topologyName: string;
  measuredValue: number;
  unit: string;
  referenceValue: number;
  deviation: number;
  deviationPct: number;
  parameterVersion: string;
  declaredParameterVersion: string;
  collectedAt: string;
  receivedAt: string;
  status: ProcessingStatus;
  attachments: Attachment[];
  fieldNotes: string;
  sourceSystem: string;
  changeSource: ChangeSource;
  changeExplanation: string;
  manualNote: string;
  runHistory: RunHistory[];
  materialBatch: string;
  operator: string;
}

export interface BatchInfo {
  batchId: string;
  createdAt: string;
  submittedBy: string;
  handoverNote: string;
  lateAttachments: Attachment[];
  supplementNotes: string;
}

export interface AlertItem {
  id: string;
  level: "warning" | "error" | "info";
  title: string;
  detail: string;
  affectedRecords: string[];
  suggestion: string;
  timestamp: string;
}

export interface FilterState {
  keyword: string;
  status: ProcessingStatus | "all";
  changeSource: ChangeSource | "all";
  parameterVersion: string | "all";
  hasLateAttachment: boolean | "all";
  hasNoConflict: boolean | "all";
  materialBatch: string | "all";
}
