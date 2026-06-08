export type RiskLevel = "low" | "medium" | "high" | "critical";

export type AnomalyType =
  | "camera_view_lost"
  | "height_deviation"
  | "coordinate_missing"
  | "risk_note_conflict"
  | "profile_incomplete";

export type ConfirmationStatus =
  | "pending"
  | "rerun_done"
  | "supplemented"
  | "manually_confirmed"
  | "all_completed";

export interface CoordinatePoint {
  x: number;
  y: number;
  z: number;
  timestamp?: string;
}

export interface ViewSnapshot {
  id: string;
  name: string;
  createdAt: string;
  createdBy: string;
  cameraParams: {
    panX: number;
    panY: number;
    zoom: number;
    visibleRange: [number, number];
  };
  notes?: string;
}

export type NoteConclusion = "safe" | "warning" | "dangerous" | "pending";

export interface RiskNoteVersion {
  id: string;
  version: number;
  content: string;
  createdAt: string;
  createdBy: string;
  conclusion: NoteConclusion;
}

export interface HandlingOpinion {
  id: string;
  type: "auto_suggestion" | "manual_input";
  content: string;
  createdAt: string;
  createdBy: string;
  status: "proposed" | "accepted" | "rejected";
}

export interface ThreeStepReview {
  rerun: {
    status: "not_started" | "running" | "passed" | "failed";
    executedAt?: string;
    executedBy?: string;
    result?: string;
    deviationBefore?: number;
    deviationAfter?: number;
  };
  supplement: {
    status: "not_started" | "in_progress" | "completed" | "not_needed";
    supplementedAt?: string;
    supplementedBy?: string;
    supplementedFields?: string[];
  };
  manualConfirm: {
    status: "not_started" | "confirmed" | "rejected";
    confirmedAt?: string;
    confirmedBy?: string;
    signature?: string;
    comments?: string;
  };
}

export interface FlightRoute {
  id: string;
  routeCode: string;
  missionName: string;
  createdAt: string;
  dataSource: string;
  sourceChain: string[];
  coordinates: CoordinatePoint[];
  profileData: number[];
  riskLevel: RiskLevel;
  heightDeviation: number;
  anomalyTypes: AnomalyType[];
  status: ConfirmationStatus;
  isArchived: boolean;
  viewSnapshots: ViewSnapshot[];
  currentViewId?: string;
  riskNoteHistory: RiskNoteVersion[];
  currentNoteId?: string;
  handlingOpinions: HandlingOpinion[];
  threeStepReview: ThreeStepReview;
  cameraViewIssue?: {
    isReported: boolean;
    lostParams?: string[];
    repairAttempts: number;
    lastRepairAt?: string;
    repairHistory: Array<{
      attemptedAt: string;
      attemptedBy: string;
      result: "success" | "failed";
      method: string;
    }>;
  };
}

export const ANOMALY_LABELS: Record<AnomalyType, string> = {
  camera_view_lost: "相机视角丢失",
  height_deviation: "高度偏差超限",
  coordinate_missing: "坐标数据缺失",
  risk_note_conflict: "风险备注矛盾",
  profile_incomplete: "剖面图不完整",
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
  critical: "严重风险",
};

export const STATUS_LABELS: Record<ConfirmationStatus, string> = {
  pending: "待处理",
  rerun_done: "重复运行完成",
  supplemented: "补录完成",
  manually_confirmed: "人工已确认",
  all_completed: "全部复核完成",
};
