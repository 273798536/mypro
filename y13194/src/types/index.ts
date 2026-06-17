export interface BatteryCell {
  id: string;
  code: string;
  position: { row: number; col: number; layer: number };
  model: string;
  nominalResistance: number;
  status: "normal" | "warning" | "anomaly" | "pending";
}

export type DirectionSign = "positive" | "negative" | "reversed";
export type ResistanceUnit = "mΩ" | "μΩ" | "Ω";
export type DataSource = "realtime" | "delayed-attachment";

export interface SensorLogEntry {
  id: string;
  batteryId: string;
  batteryCode: string;
  timestamp: number;
  resistance: number;
  voltage: number;
  temperature: number;
  directionSign: DirectionSign;
  unit: ResistanceUnit;
  thresholdVersion: string;
  remarkIds: string[];
  screenshotIds: string[];
  source: DataSource;
  isAudited: boolean;
  isAnomaly: boolean;
  anomalyType?: "direction-reversed" | "jump-threshold" | "jump-unit" | "jump-late-data" | "unknown";
  evidenceStatus?: "pending" | "collected" | "unavailable";
  auditedBy?: string;
  auditedAt?: number;
}

export interface Remark {
  id: string;
  logId: string;
  content: string;
  operator: string;
  createdAt: number;
  version: number;
  isLatest: boolean;
}

export interface Screenshot {
  id: string;
  logId: string;
  url: string;
  thumbnail: string;
  version: number;
  uploadedBy: string;
  uploadedAt: number;
  description?: string;
}

export interface JumpDetection {
  id: string;
  logId: string;
  previousLogId: string;
  delta: number;
  deltaPercent: number;
  causeType: "threshold" | "unit" | "late-attachment" | "unknown";
  evidence: {
    field: string;
    oldValue: string;
    newValue: string;
    timestamp: number;
  }[];
}

export type ReportTemplate = "standard" | "simplified" | "full-history";
export type ReportStatus = "queued" | "generating" | "completed" | "failed" | "paused";

export interface ReportConfig {
  id: string;
  name: string;
  template: ReportTemplate;
  batteryIds: string[];
  timeRange: { start: number; end: number };
  includeAnomalies: boolean;
  includeHistory: boolean;
  status: ReportStatus;
  progress: number;
  createdAt: number;
  createdBy: string;
  downloadUrl?: string;
  isSample?: boolean;
}

export interface ActivityLog {
  id: string;
  timestamp: number;
  operator: string;
  action:
    | "remark.add"
    | "remark.edit"
    | "screenshot.upload"
    | "anomaly.mark"
    | "audit.approve"
    | "evidence.update"
    | "report.export";
  targetId: string;
  detail: string;
}

export interface LogFilters {
  batteryIds: string[];
  batchId?: string;
  resistanceRange?: { min: number; max: number };
  units: ResistanceUnit[];
  remarkKeyword?: string;
  anomalyOnly: boolean;
  unauditedOnly: boolean;
  directionSigns: DirectionSign[];
}
