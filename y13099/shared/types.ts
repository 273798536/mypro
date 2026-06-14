export type PlanStatus = "pass" | "supplement" | "exception" | "withdrawn";

export type TimelineNodeType =
  | "created"
  | "sensor_collect"
  | "first_review"
  | "rejudge"
  | "withdrawn"
  | "final_review";

export interface Plan {
  id: string;
  corridorCode: string;
  corridorName: string;
  status: PlanStatus;
  sensorSourceSummary: string;
  conclusionSummary: string;
  createdAt: string;
  updatedAt: string;
  primarySensorRecordId?: string;
}

export interface TimelineNode {
  id: string;
  planId: string;
  type: TimelineNodeType;
  title: string;
  timestamp: string;
  sensorRecordId?: string;
  corridorSegmentIndex?: number;
  detail: Record<string, unknown>;
}

export interface SensorRecord {
  id: string;
  deviceCode: string;
  type: string;
  timestamp: string;
  rawReading: number;
  unit: string;
  corridorSegmentIndex: number;
  metadata: Record<string, unknown>;
}

export interface WithdrawalLink {
  id: string;
  planId: string;
  withdrawalRecordId: string;
  withdrawalReason: string;
  supplementedMaterialIds: string[];
  finalConclusionId: string;
  finalConclusionText: string;
}

export interface Conclusion {
  id: string;
  planId: string;
  result: PlanStatus;
  createdAt: string;
  basis: ConclusionBasis[];
  actionItems: ActionItem[];
}

export interface ConclusionBasis {
  id: string;
  conclusionId: string;
  sensorRecordId: string;
  sensorDeviceCode: string;
  sensorTimestamp: string;
  rawReading: number;
  interpretation: string;
}

export interface ActionItem {
  id: string;
  planId: string;
  type: "release" | "supplement";
  description: string;
  materialRef?: string;
}

export interface PlanDetail extends Plan {
  timeline: TimelineNode[];
  withdrawalLink: Omit<WithdrawalLink, "id"> | null;
  conclusion: Conclusion | null;
  actionSummary: ActionItem[];
}

export const STATUS_LABEL_MAP: Record<PlanStatus, string> = {
  pass: "通过放行",
  supplement: "待补材料",
  exception: "异常待审",
  withdrawn: "已撤回",
};

export const TIMELINE_TYPE_LABEL_MAP: Record<TimelineNodeType, string> = {
  created: "方案创建",
  sensor_collect: "传感器采集",
  first_review: "初审",
  rejudge: "改判",
  withdrawn: "撤回",
  final_review: "终审结论",
};

export interface RejudgeRequest {
  reason: string;
  supplementedMaterials: string[];
  newStatus: PlanStatus;
}

export interface ListPlansResponse {
  plans: Plan[];
  total: number;
  filterSnapshot: Record<string, string>;
}

export interface GetPlanDetailResponse {
  plan: PlanDetail;
}

export interface RejudgeResponse {
  plan: PlanDetail;
}

export interface GetPlanHistoryResponse {
  nodes: TimelineNode[];
}

export interface GetSensorRecordResponse {
  record: SensorRecord;
}

export interface ListSensorRecordsResponse {
  records: SensorRecord[];
}

export interface ListExceptionsResponse {
  exceptions: Plan[];
  filterSnapshot: Record<string, string>;
}

export interface ExportExceptionsResponse {
  downloadUrl: string;
  filterSnapshot: Record<string, string>;
  exportedAt: string;
  statusEnum: Record<string, string>;
}
