export type ComplaintType = 'noise' | 'occupation' | 'hygiene' | 'schedule';
export type ComplaintStatus = 'processed' | 'pending' | 'evidence_needed';
export type SourceType = 'original' | 'supplement' | 'screenshot';

export interface Location {
  id: string;
  canonicalName: string;
  aliases: string[];
  x: number;
  y: number;
  z: number;
}

export interface ComplaintEvent {
  id: string;
  locationId: string;
  type: ComplaintType;
  status: ComplaintStatus;
  description: string;
  eventDate: string;
}

export interface ApprovalRecord {
  id: string;
  complaintId: string;
  content: string;
  sourceType: SourceType;
  recordDate: string;
  version: string;
}

export interface HistorySnapshot {
  id: string;
  approvalId: string;
  fieldChanged: string;
  oldValue: string;
  newValue: string;
  changeDate: string;
  changeReason: string;
  screenshotUrl?: string;
}

export interface PhotoSupplement {
  id: string;
  complaintId: string;
  locationId: string;
  photoUrl: string;
  supplementDate: string;
  changedDescription: string;
}

export interface TimeRange {
  start: string;
  end: string;
}

export interface FilterState {
  types: ComplaintType[];
  statuses: ComplaintStatus[];
  sourceTypes: SourceType[];
  locationId: string | null;
  searchAlias: string;
}

export const COMPLAINT_TYPE_LABELS: Record<ComplaintType, string> = {
  noise: '噪音',
  occupation: '占道',
  hygiene: '卫生',
  schedule: '时段',
};

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  processed: '已处理',
  pending: '进行中',
  evidence_needed: '待补证据',
};

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  original: '原始记录',
  supplement: '补录备注',
  screenshot: '旧版截图',
};
