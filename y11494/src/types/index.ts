export enum UserRole {
  DATA_ENTRY = 'data_entry',
  REVIEWER = 'reviewer',
  MANAGER = 'manager',
  READ_ONLY = 'read_only'
}

export enum DocumentType {
  QUALIFICATION = 'qualification',
  QUOTATION = 'quotation',
  STAMPED_SCAN = 'stamped_scan',
  SUPPLIER_STATEMENT = 'supplier_statement',
  APPROVAL_EMAIL = 'approval_email',
  RECEIPT_PHOTO = 'receipt_photo'
}

export enum DocumentStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  REJECTED = 'rejected',
  SECOND_CONFIRMATION = 'second_confirmation',
  READ_ONLY_AUDIT = 'read_only_audit',
  FINALIZED = 'finalized'
}

export enum DirtyType {
  MISSING_FIELD = 'missing_field',
  CROSS_DATE = 'cross_date',
  RENAMED = 'renamed',
  AMOUNT_CONFLICT = 'amount_conflict',
  QUANTITY_CONFLICT = 'quantity_conflict',
  FUZZY_IMAGE = 'fuzzy_image'
}

export interface User {
  id: number;
  username: string;
  password: string;
  name: string;
  role: UserRole;
  department: string;
  phone: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: number;
  projectNo: string;
  projectName: string;
  clientName: string;
  bidDeadline: string;
  projectManagerId: number;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: number;
  projectId: number;
  documentType: DocumentType;
  documentNo: string;
  version: number;
  title: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileHash: string;
  status: DocumentStatus;
  amount?: number;
  quantity?: number;
  supplierName?: string;
  effectiveDate?: string;
  expiryDate?: string;
  pageCount?: number;
  isDirty: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChangeRecord {
  id: number;
  documentId: number;
  projectId: number;
  operatorId: number;
  operatorName: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  changeReason: string;
  changedAt: string;
}

export interface DirtyRecord {
  id: number;
  documentId: number;
  projectId: number;
  dirtyType: DirtyType;
  fieldName?: string;
  originalValue?: string;
  currentValue?: string;
  description: string;
  handlerId?: number;
  handlerName?: string;
  handlingOpinion?: string;
  handledAt?: string;
  isResolved: boolean;
  createdAt: string;
}

export interface StatusTransition {
  id: number;
  documentId: number;
  projectId: number;
  fromStatus: DocumentStatus;
  toStatus: DocumentStatus;
  operatorId: number;
  operatorName: string;
  reason: string;
  transitionedAt: string;
}

export interface AuditLog {
  id: number;
  userId: number;
  userName: string;
  action: string;
  resourceType: string;
  resourceId?: number;
  ip?: string;
  userAgent?: string;
  details: string;
  createdAt: string;
}

export interface ExportRecord {
  id: number;
  projectId: number;
  exportedBy: number;
  exporterName: string;
  exportType: string;
  isDesensitized: boolean;
  fileHash: string;
  fileSize: number;
  documentIds: string;
  exportedAt: string;
}

export interface JWTPayload {
  userId: number;
  username: string;
  role: UserRole;
  name: string;
}
