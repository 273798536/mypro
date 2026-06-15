export type ComplaintStatus = "pending" | "processing" | "duplicate" | "closed";

export type ComplaintSource = "12345热线" | "社区信箱" | "网格员上报" | "媒体曝光" | "其他";

export interface JudgmentHistory {
  id: string;
  pointId: string;
  judgmentBefore: string;
  judgmentAfter: string;
  operator: string;
  modifiedAt: string;
  changeReason: string;
}

export interface PhotoAttachment {
  id: string;
  pointId: string;
  photoUrl: string;
  uploader: string;
  uploadedAt: string;
  remark: string;
}

export interface ComplaintRecord {
  id: string;
  pointId: string;
  complaintContent: string;
  complainant: string;
  complaintTime: string;
  timelineTag: string;
}

export interface ComplaintPoint {
  id: string;
  lng: number;
  lat: number;
  source: ComplaintSource;
  status: ComplaintStatus;
  address: string;
  isConflict: boolean;
  isDuplicate: boolean;
  currentJudgment: string;
  complaintCount: number;
  latestComplaintAt: string;
  firstComplaintAt: string;
  rawFields: Record<string, string>;
  records: ComplaintRecord[];
  history: JudgmentHistory[];
  photos: PhotoAttachment[];
}

export interface TimelinePhase {
  key: string;
  label: string;
  date: string;
  description: string;
}

export interface FieldMapping {
  source: string[];
  status: string[];
}

export const RESULT_WORDS: Record<ComplaintStatus, string> = {
  pending: "待复核",
  processing: "处理中",
  duplicate: "重复投诉·不予受理",
  closed: "已结案·准予备案",
};

export const STATUS_COLORS: Record<ComplaintStatus, string> = {
  pending: "#FF8C42",
  processing: "#34D399",
  duplicate: "#EC4899",
  closed: "#64748B",
};

export const GUARANTEED_FIELD_MAPPING: FieldMapping = {
  source: ["来源", "投诉来源", "source", "from_channel", "渠道来源", "信息来源"],
  status: ["处理状态", "status", "state", "处理结果", "当前状态", "办结状态"],
};
