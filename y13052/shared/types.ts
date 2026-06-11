export type CaseStatus = 'pending' | 'approved' | 'rejected' | 'abnormal';

export type ObjectType = 'wind_turbine' | 'transmission_tower' | 'cable' | 'access_road';

export type TimelineEventType = 'create' | 'inspection' | 'report' | 'review' | 'rejudge' | 'attachment' | 'gap' | 'abnormal';

export type HistoryAction = 'create' | 'review' | 'rejudge' | 'mark_abnormal' | 'supplement';

export type FileType = 'image' | 'pdf' | 'excel' | 'other';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface InspectionPhoto {
  id: string;
  caseId: string;
  url: string;
  thumbnailUrl: string;
  rowNumber: number;
  objectId: string | null;
  originalNote: string;
  takenAt: string;
  uploadedAt: string;
  isLate: boolean;
}

export interface TimelineEvent {
  id: string;
  caseId: string;
  timestamp: string;
  type: TimelineEventType;
  title: string;
  description: string;
  photoId?: string;
  objectId?: string;
  isGap?: boolean;
  gapReason?: string;
}

export interface LateAttachment {
  id: string;
  caseId: string;
  fileName: string;
  fileType: FileType;
  filePath: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
  linkedToConclusion: boolean;
  conclusionId?: string;
  description: string;
}

export interface CollisionObject {
  id: string;
  caseId: string;
  type: ObjectType;
  name: string;
  coordinates: { lng: number; lat: number };
  sourceRow: number;
  sourcePhotoId: string;
  description: string;
  riskLevel: RiskLevel;
}

export interface PreReviewCase {
  id: string;
  caseNumber: string;
  location: string;
  status: CaseStatus;
  objectType: ObjectType;
  collisionSummary: string;
  createdAt: string;
  updatedAt: string;
  lastOperator: string;
  photoCount: number;
  hasLateAttachment: boolean;
  rejudgeCount: number;
  photos: InspectionPhoto[];
  timeline: TimelineEvent[];
  attachments: LateAttachment[];
  collisionObjects: CollisionObject[];
}

export interface HistoryRecord {
  id: string;
  caseId: string;
  caseNumber: string;
  action: HistoryAction;
  operator: string;
  operatedAt: string;
  fromStatus?: CaseStatus;
  toStatus?: CaseStatus;
  reason?: string;
  linkedPhotoIds?: string[];
  linkedObjectIds?: string[];
  linkedAttachmentIds?: string[];
  abnormalNote?: string;
  isSupplement: boolean;
}

export interface RejudgeRequest {
  toStatus: CaseStatus;
  reason: string;
  operator: string;
  linkedPhotoIds: string[];
  linkedObjectIds: string[];
  linkedAttachmentIds?: string[];
  markAbnormal?: boolean;
  abnormalNote?: string;
}

export interface SupplementRequest {
  operator: string;
  reason: string;
  extraPhotos?: {
    url: string;
    thumbnailUrl: string;
    rowNumber: number;
    objectId: string | null;
    originalNote: string;
    takenAt: string;
    isLate: boolean;
  }[];
  extraAttachments?: {
    fileName: string;
    fileType: 'image' | 'pdf' | 'excel' | 'other';
    uploadedBy: string;
    description: string;
  }[];
  extraTimeline?: {
    timestamp: string;
    title: string;
    description: string;
    photoId?: string;
    objectId?: string;
  }[];
  linkedAttachmentIds?: string[];
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp: string;
}

export interface CaseListQuery {
  status?: CaseStatus;
  objectType?: ObjectType;
  keyword?: string;
}

export interface HistoryQuery {
  caseId?: string;
  operator?: string;
  action?: HistoryAction;
}

export const STATUS_LABEL: Record<CaseStatus, string> = {
  pending: '待复核',
  approved: '已通过',
  rejected: '已驳回',
  abnormal: '异常',
};

export const OBJECT_TYPE_LABEL: Record<ObjectType, string> = {
  wind_turbine: '风机',
  transmission_tower: '输电塔',
  cable: '海缆',
  access_road: '检修便道',
};

export const ACTION_LABEL: Record<HistoryAction, string> = {
  create: '创建',
  review: '复核',
  rejudge: '改判',
  mark_abnormal: '标记异常',
  supplement: '补录',
};

export const RISK_LABEL: Record<RiskLevel, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
};
