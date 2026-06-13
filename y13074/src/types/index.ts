export type ProcessingStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'evidence_needed'
  | 'confirmed';

export const PROCESSING_STATUS_LABEL: Record<ProcessingStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  completed: '已处理',
  evidence_needed: '待补证据',
  confirmed: '已确认',
};

export const PROCESSING_STATUS_COLOR: Record<ProcessingStatus, string> = {
  pending: 'bg-gray-100 text-gray-700 border-gray-300',
  processing: 'bg-blue-50 text-blue-700 border-blue-300',
  completed: 'bg-green-50 text-green-700 border-green-300',
  evidence_needed: 'bg-amber-50 text-amber-700 border-amber-300',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-300',
};

export type CommentSource =
  | 'expert_review'
  | 'onsite_inspection'
  | 'design_doc'
  | 'safety_spec'
  | 'operation_feedback'
  | 'other';

export const COMMENT_SOURCE_LABEL: Record<CommentSource, string> = {
  expert_review: '专家评审',
  onsite_inspection: '现场踏勘',
  design_doc: '设计文档',
  safety_spec: '安全规范',
  operation_feedback: '运维反馈',
  other: '其他',
};

export interface CameraView {
  id: string;
  name: string;
  position: [number, number, number];
  target: [number, number, number];
  savedAt: string;
  savedBy: string;
}

export interface ReviewComment {
  id: string;
  optionId: string;
  timelineSegmentId: string | null;
  content: string;
  source: CommentSource;
  status: ProcessingStatus;
  handler?: string;
  handledAt?: string;
  evidenceRefs?: string[];
  originalFieldName?: string;
  rawFields?: Record<string, string>;
  floorUnitMixed?: boolean;
  floorUnitCheckNote?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface TimelineSegment {
  id: string;
  name: string;
  description: string;
  order: number;
  startElevation: number;
  endElevation: number;
}

export interface StationOption {
  id: string;
  code: 'A' | 'B' | 'C';
  name: string;
  description: string;
  position: [number, number, number];
  color: string;
  elevation: number;
  floorArea: number;
  capacity: number;
  buildingFloors: string;
  advantages: string[];
  disadvantages: string[];
}

export interface FloorUnitCheckResult {
  hasMixedUnit: boolean;
  originalValue: string;
  normalizedValue?: string;
  reason: string;
  nextStep: string;
  needsManualConfirm: boolean;
}
