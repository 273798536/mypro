export enum ExceptionStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  REVIEWING = 'reviewing',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUPPLEMENT_REQUIRED = 'supplement_required',
  FROZEN = 'frozen',
  SETTLED = 'settled',
  WITHDRAWN = 'withdrawn',
  ARCHIVED = 'archived'
}

export enum ExceptionType {
  MISSING_SIGN = 'missing_sign',
  LATE_SIGN = 'late_sign',
  EARLY_LEAVE = 'early_leave',
  PROXY_SIGN = 'proxy_sign',
  MAKEUP_SIGN = 'makeup_sign',
  MIXED_SIGN = 'mixed_sign',
  HOMEWORK_INCOMPLETE = 'homework_incomplete',
  PHOTO_ABNORMAL = 'photo_abnormal',
  SMS_EVIDENCE = 'sms_evidence'
}

export enum ReviewResult {
  CONFIRMED_ABNORMAL = 'confirmed_abnormal',
  CORRECTED_NORMAL = 'corrected_normal',
  NEED_MORE_EVIDENCE = 'need_more_evidence',
  ESCALATED = 'escalated'
}

export enum Role {
  ADMIN = 'admin',
  HRBP = 'hrbp',
  TRAINING_ADMIN = 'training_admin',
  DEPT_MANAGER = 'dept_manager',
  EMPLOYEE = 'employee',
  AUDITOR = 'auditor'
}

export enum SourceType {
  REGISTRATION_FORM = 'registration_form',
  SIGN_QRCODE = 'sign_qrcode',
  HOMEWORK = 'homework',
  ABNORMAL_PHOTO = 'abnormal_photo',
  SMS_SCREENSHOT = 'sms_screenshot',
  MANUAL_ENTRY = 'manual_entry'
}

export enum ActionType {
  BATCH_CREATE = 'batch_create',
  ATTACHMENT_UPLOAD = 'attachment_upload',
  REVIEW = 'review',
  REVISE = 'revise',
  FREEZE = 'freeze',
  UNFREEZE = 'unfreeze',
  SETTLE = 'settle',
  WITHDRAW = 'withdraw',
  ARCHIVE = 'archive',
  REACTIVATE = 'reactivate',
  EXPORT = 'export',
  PERMISSION_DENIED = 'permission_denied'
}

export interface ImportSource {
  sourceFileName: string;
  sourceFileHash: string;
  originalRowNumber: number;
  originalValue: string;
  parsedValue: any;
  sourceType: SourceType;
}

export interface StateTransition {
  fromStatus: ExceptionStatus;
  toStatus: ExceptionStatus;
  triggeredBy: ActionType;
  changedBy: string;
  changeReason: string;
  changedAt: Date;
  snapshotBefore: any;
  snapshotAfter: any;
  diff: any;
}

export interface ExceptionRecord {
  id: string;
  batchId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  trainingId: string;
  trainingName: string;
  trainingDate: Date;
  exceptionType: ExceptionType;
  status: ExceptionStatus;
  importSource: ImportSource;
  originalEvidence: any;
  currentEvidence: any;
  reviewHistory: ReviewRecord[];
  stateTransitions: StateTransition[];
  attachments: Attachment[];
  isFrozen: boolean;
  frozenAt?: Date;
  frozenBy?: string;
  freezeReason?: string;
  settledAt?: Date;
  settledBy?: string;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface ReviewRecord {
  id: string;
  exceptionId: string;
  reviewer: string;
  reviewerRole: Role;
  result: ReviewResult;
  reason: string;
  manualOverride: boolean;
  previousStatus: ExceptionStatus;
  newStatus: ExceptionStatus;
  reviewedAt: Date;
}

export interface Attachment {
  id: string;
  exceptionId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileHash: string;
  storagePath: string;
  uploadedBy: string;
  uploadedAt: Date;
  description: string;
  isOriginalEvidence: boolean;
}

export interface Batch {
  id: string;
  batchNo: string;
  name: string;
  trainingId: string;
  trainingName: string;
  sourceFiles: SourceFileInfo[];
  totalCount: number;
  successCount: number;
  failedCount: number;
  failedRecords: FailedRecord[];
  status: 'processing' | 'completed' | 'partial_failed';
  createdBy: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface SourceFileInfo {
  fileName: string;
  fileHash: string;
  sourceType: SourceType;
  recordCount: number;
  storagePath: string;
}

export interface FailedRecord {
  rowNumber: number;
  originalValue: string;
  errorMessage: string;
  errorCode: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: Role;
  actionType: ActionType;
  resourceType: string;
  resourceId: string;
  ipAddress: string;
  userAgent: string;
  requestBody: any;
  responseBody: any;
  success: boolean;
  errorMessage?: string;
  createdAt: Date;
}

export interface User {
  id: string;
  employeeId: string;
  name: string;
  role: Role;
  department: string;
  permissions: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
