export type Player = "black" | "white";

export type MoveStatus =
  | "normal"
  | "boundary_error"
  | "confirmed"
  | "pending"
  | "undone";

export interface Move {
  id: string;
  x: number;
  y: number;
  player: Player;
  timestamp: number;
  layerId: string;
  status: MoveStatus;
  note?: string;
  order: number;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  color: string;
}

export type ProjectStatus = "draft" | "completed" | "error" | "pending_review";

export interface Issue {
  id: string;
  type: "boundary_error" | "missing_trace" | "inconsistent_status" | "other";
  severity: "error" | "warning" | "info";
  message: string;
  actionable: string;
  relatedMoveId?: string;
}

export interface Project {
  id: string;
  name: string;
  moves: Move[];
  layers: Layer[];
  status: ProjectStatus;
  issues: Issue[];
  createdAt: number;
  updatedAt: number;
  boardSize: number;
  description?: string;
}

export interface HistoryState {
  moves: Move[];
  layers: Layer[];
}

export type ExportStatus = "success" | "warning" | "error";

export interface ExportResult {
  status: ExportStatus;
  message: string;
  filename?: string;
  issues?: Issue[];
}

export const STATUS_COLORS: Record<MoveStatus, string> = {
  normal: "#3b82f6",
  boundary_error: "#ef4444",
  confirmed: "#10b981",
  pending: "#f59e0b",
  undone: "#94a3b8",
};

export const STATUS_LABELS: Record<MoveStatus, string> = {
  normal: "正常",
  boundary_error: "越界错误",
  confirmed: "已确认",
  pending: "待确认",
  undone: "已撤销",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: "草稿",
  completed: "已完成",
  error: "存在错误",
  pending_review: "待复核",
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  draft: "#3b82f6",
  completed: "#10b981",
  error: "#ef4444",
  pending_review: "#f59e0b",
};
