export type DocumentType = 'SAMPLE_FLOW' | 'SIZE_MODIFY' | 'FABRIC_STOCK' | 'SUPPLEMENT' | 'SHIFT_RECORD';

export type BatchStatus = 'DRAFT' | 'PENDING_REVIEW' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'FROZEN' | 'SETTLED' | 'ARCHIVED';

export type DocumentStatus = 'DRAFT' | 'PENDING_REVIEW' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'MODIFIED' | 'FROZEN' | 'ARCHIVED';

export type TaskStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'WAITING_RETRY' | 'WAITING_MANUAL' | 'PERMANENT_FAILED';

export type DuplicateStrategy = 'IGNORE' | 'OVERWRITE' | 'APPEND';

export type FabricDisposition = 'RETURN' | 'SCRAP' | 'REUSE';

export type ReviewDecision = 'APPROVE' | 'REJECT' | 'MODIFY';

export type ReportType = 'FREEZE' | 'SETTLE' | 'SUMMARY';

export interface Batch {
  id: string;
  batchNo: string;
  styleCode: string;
  brand: string;
  status: BatchStatus;
  duplicateStrategy: DuplicateStrategy;
  frozen: boolean;
  frozenReason?: string;
  frozenAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  batchId: string;
  documentType: DocumentType;
  documentNo: string;
  styleCode: string;
  version: number;
  data: Record<string, any>;
  status: DocumentStatus;
  reviewReason?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FabricTrack {
  id: string;
  documentId: string;
  styleCode: string;
  oldVersion: number;
  newVersion: number;
  fabricCode: string;
  disposition: FabricDisposition;
  remark?: string;
  recordedBy: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  documentId?: string;
  batchId?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface Task {
  id: string;
  batchId?: string;
  documentId?: string;
  type: string;
  status: TaskStatus;
  retryCount: number;
  maxRetries: number;
  payload: Record<string, any>;
  errorMessage?: string;
  errorType?: string;
  nextRetryAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  beforeData?: Record<string, any>;
  afterData?: Record<string, any>;
  reason?: string;
  operatedBy: string;
  createdAt: string;
}

export interface Report {
  id: string;
  batchId: string;
  type: ReportType;
  data: Record<string, any>;
  generatedBy: string;
  createdAt: string;
}

export interface DiffField {
  field: string;
  oldValue: any;
  newValue: any;
  changeType: 'ADD' | 'MODIFY' | 'DELETE';
}

export interface DocumentDiff {
  fields: DiffField[];
  modifiedBy: string;
  modifiedAt: string;
  reason: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateBatchRequest {
  batchNo: string;
  styleCode: string;
  brand: string;
  duplicateStrategy: DuplicateStrategy;
  createdBy: string;
  remark?: string;
}

export interface CreateDocumentRequest {
  batchId: string;
  documentType: DocumentType;
  documentNo: string;
  styleCode: string;
  version: number;
  data: Record<string, any>;
  attachments?: string[];
  createdBy: string;
}

export interface ReviewDecisionRequest {
  decision: ReviewDecision;
  reason: string;
  modifiedData?: Record<string, any>;
  decidedBy: string;
}

export interface FreezeRequest {
  reason: string;
  operatedBy: string;
}

export interface SettleRequest {
  remark?: string;
  operatedBy: string;
}

export interface ManualTaskRequest {
  action: 'FIX' | 'SKIP' | 'CANCEL';
  remark: string;
  operatedBy: string;
}

export interface GenerateReportRequest {
  batchId: string;
  type: ReportType;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  SAMPLE_FLOW: '样衣流转单',
  SIZE_MODIFY: '尺码修改意见',
  FABRIC_STOCK: '面料出入库',
  SUPPLEMENT: '临时补录单',
  SHIFT_RECORD: '班次记录'
};

export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  DRAFT: '草稿',
  PENDING_REVIEW: '待复核',
  UNDER_REVIEW: '复核中',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  FROZEN: '已冻结',
  SETTLED: '已结算',
  ARCHIVED: '已归档'
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: '待处理',
  PROCESSING: '处理中',
  SUCCESS: '成功',
  WAITING_RETRY: '等重试',
  WAITING_MANUAL: '等人工',
  PERMANENT_FAILED: '永久失败'
};

export const FABRIC_DISPOSITION_LABELS: Record<FabricDisposition, string> = {
  RETURN: '退回仓库',
  SCRAP: '报废',
  REUSE: '留用'
};
