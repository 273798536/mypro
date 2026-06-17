export type MaterialType = "meeting_minutes" | "opinion_form" | "supplementary_note" | "conclusion";

export interface Material {
  id: string;
  schemeId: string;
  type: MaterialType;
  content: string;
  source: string;
  createdAt: string;
  relatedMaterialIds: string[];
}

export interface LocationPoint {
  id: string;
  rawName: string;
  canonicalName: string;
  schemeId: string;
  mergedFrom: string[];
}

export interface MergeRecord {
  id: string;
  pointIds: string[];
  reason: string;
  operator: string;
  timestamp: string;
  isAdjacentWarning: boolean;
  evidenceSnapshot: { originalA: string; originalB: string };
}

export type AnomalyStatus = "pending" | "confirmed" | "reverted";
export type AnomalyType = "adjacent_mismatch";

export interface AnomalyRecord {
  id: string;
  mergeRecordId: string;
  type: AnomalyType;
  description: string;
  suggestion: string;
  status: AnomalyStatus;
  handledBy?: string;
  handledAt?: string;
}

export interface Scheme {
  id: string;
  name: string;
  conclusion?: string;
  materials: Material[];
  locationPoints: LocationPoint[];
  mergeRecords: MergeRecord[];
  anomalies: AnomalyRecord[];
}

export type ExportPerspective = "scene_annotation" | "sidebar_note" | "page_summary";

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  meeting_minutes: "会议纪要",
  opinion_form: "意见表",
  supplementary_note: "后补备注",
  conclusion: "结论",
};

export const ANOMALY_STATUS_LABELS: Record<AnomalyStatus, string> = {
  pending: "待确认",
  confirmed: "已确认",
  reverted: "已拆分",
};

export const EXPORT_PERSPECTIVE_LABELS: Record<ExportPerspective, string> = {
  scene_annotation: "场景标注",
  sidebar_note: "侧边说明",
  page_summary: "页面摘要",
};
