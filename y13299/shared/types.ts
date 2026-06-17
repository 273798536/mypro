export type RecordStatus = 'pending' | 'approved' | 'exception' | 'need_evidence' | 'suspected_duplicate';

export type ExceptionType = 'coordinate_offset' | 'duplicate_location' | 'material_conflict' | 'late_attachment';

export type ExceptionStatus = 'open' | 'reviewed' | 'resolved';

export type OperationType = 'create' | 'import' | 'judgment_change' | 'attachment_add' | 'merge' | 'exception_detected';

export interface GisPoint {
  id: string;
  lng: number;
  lat: number;
  source: string;
  batchId: string;
  importedAt: string;
  isAbnormal?: boolean;
  abnormalNote?: string;
}

export interface MaterialAttachment {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
  batchId: string;
  note?: string;
}

export interface SeatRecord {
  id: string;
  code: string;
  locationName: string;
  street: string;
  status: RecordStatus;
  points: GisPoint[];
  attachments: MaterialAttachment[];
  materialCompleteness: number;
  latestJudgment?: string;
  latestJudgmentReason?: string;
  latestJudgmentAt?: string;
  latestJudgmentBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryEntry {
  id: string;
  recordId: string;
  operationType: OperationType;
  operator: string;
  operatedAt: string;
  beforeState?: unknown;
  afterState?: unknown;
  note?: string;
  evidence?: string;
}

export interface ExceptionItem {
  id: string;
  type: ExceptionType;
  relatedRecordIds: string[];
  detectedAt: string;
  status: ExceptionStatus;
  description: string;
  comparisonData?: {
    before?: unknown;
    after?: unknown;
    changedFields?: string[];
    [key: string]: unknown;
  };
  resolvedNote?: string;
  resolvedAt?: string;
}

export interface JudgmentChangeRequest {
  status: RecordStatus;
  reason: string;
  markAsException?: boolean;
  operator: string;
}

export interface AttachmentUploadRequest {
  name: string;
  type: string;
  note?: string;
  gisPoints?: Omit<GisPoint, 'id' | 'importedAt'>[];
}

export interface StatsData {
  pending: number;
  approved: number;
  exception: number;
  needEvidence: number;
  suspectedDuplicate: number;
  total: number;
}
