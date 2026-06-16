export type MergeStatus = "merged" | "pending" | "doubtful" | "risk";

export type RiskLevel = "none" | "low" | "high";

export type SourceType = "feedback" | "system" | "import";

export type EvidenceType = "name_match" | "geo_prox" | "text_ref";

export type HistoryAction =
  | "confirm"
  | "split"
  | "merge"
  | "doubt"
  | "return";

export type SubmissionChannel =
  | "微信小程序"
  | "12345热线"
  | "市政官网"
  | "现场登记"
  | "社区转达";

export interface NoisePointGroup {
  groupId: string;
  canonicalName: string;
  status: MergeStatus;
  confidence: number;
  latitude: number;
  longitude: number;
  variantCount: number;
  evidenceCount: number;
  riskLevel: RiskLevel;
  createdAt: string;
  updatedAt: string;
}

export interface NameVariant {
  variantId: string;
  groupId: string;
  variantText: string;
  sourceType: SourceType;
  feedbackId: string;
  firstSeen: string;
  isLateAttachment: boolean;
}

export interface ResidentFeedback {
  feedbackId: string;
  submitterName: string;
  submitterPhone: string;
  submitTime: string;
  contentText: string;
  attachmentUrls: string[];
  rawLocationText: string;
  isLate: boolean;
  submissionChannel: SubmissionChannel;
}

export interface Evidence {
  evidenceId: string;
  groupId: string;
  variantId: string;
  feedbackId: string;
  evidenceType: EvidenceType;
  weight: number;
  description: string;
}

export interface AdjacentRisk {
  riskId: string;
  groupA: string;
  groupB: string;
  distanceMeters: number;
  warningReason: string;
  reviewed: boolean;
}

export interface HistoryRecord {
  recordId: string;
  groupId: string;
  operator: string;
  action: HistoryAction;
  beforeState: string;
  afterState: string;
  remark: string;
  operateTime: string;
  sessionId: string;
}

export interface FilterCriteria {
  statuses: MergeStatus[];
  riskLevels: RiskLevel[];
  dateRange: [string, string] | null;
  operators: string[];
  keyword: string;
}

export interface ExportOptions {
  includeEvidence: boolean;
  includeHistory: boolean;
  format: "csv" | "json";
  filename: string;
}

export const STATUS_LABEL: Record<MergeStatus, string> = {
  merged: "已归并",
  pending: "待确认",
  doubtful: "存疑",
  risk: "相邻风险",
};

export const STATUS_COLOR: Record<MergeStatus, string> = {
  merged: "#059669",
  pending: "#EA580C",
  doubtful: "#DC2626",
  risk: "#7C3AED",
};

export const ACTION_LABEL: Record<HistoryAction, string> = {
  confirm: "确认归并",
  split: "拆分点位",
  merge: "合并至他组",
  doubt: "标记存疑",
  return: "退回算法",
};
