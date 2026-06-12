export type ConclusionStatus = "pending" | "approved" | "rejected" | "revised";

export interface SchemeListItem {
  id: string;
  schemeNo: string;
  bridgeTunnelName: string;
  pointCoord: string;
  schemeType: string;
  conclusion: ConclusionStatus;
  hasGap: boolean;
  supplementaryNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListQuery {
  bridgeTunnelName?: string;
  schemeType?: string;
  conclusion?: string;
  hasGap?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface TimelineEntry {
  id: string;
  schemeId: string;
  timestamp: string;
  event: string;
  isGap: boolean;
  gapReason?: string;
  sortOrder: number;
}

export interface HistoryEntry {
  id: string;
  schemeId: string;
  timestamp: string;
  action: "conclusion_change" | "note_update" | "create";
  oldValue: string | null;
  newValue: string;
  reason?: string;
  operator: string;
}

export interface SchemeDetail extends SchemeListItem {
  description: string;
  finalConclusion: string;
  supplementaryNote: string;
  timeline: TimelineEntry[];
  history: HistoryEntry[];
}

export interface RejudgePayload {
  newConclusion: ConclusionStatus;
  reason: string;
  operator: string;
}

export interface UpdateNotePayload {
  supplementaryNote: string;
  operator: string;
}

export interface ReportQuery {
  schemeIds?: string[];
  filters?: ListQuery;
}

export const CONCLUSION_LABELS: Record<ConclusionStatus, string> = {
  pending: "待定",
  approved: "通过",
  rejected: "否决",
  revised: "改判",
};
