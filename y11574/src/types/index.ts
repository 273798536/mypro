export enum UserRole {
  DATA_ENTRY = 'data_entry',
  REVIEWER = 'reviewer',
  SUPERVISOR = 'supervisor',
  READ_ONLY = 'read_only'
}

export enum WorkflowStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  REJECTED = 'rejected',
  SECOND_CONFIRMATION = 'second_confirmation',
  AUDIT_ONLY = 'audit_only'
}

export enum DirtyRecordType {
  MISSING_FIELDS = 'missing_fields',
  CROSS_DATE = 'cross_date',
  NAME_CHANGE = 'name_change',
  AMOUNT_CONFLICT = 'amount_conflict',
  QUANTITY_CONFLICT = 'quantity_conflict'
}

export enum DataSource {
  SESSION_SUMMARY = 'session_summary',
  SLA_RULE = 'sla_rule',
  COMPENSATION_APPROVAL = 'compensation_approval',
  SUPPLIER_STATEMENT = 'supplier_statement',
  APPROVAL_EMAIL = 'approval_email'
}

export enum DuplicateStrategy {
  OVERWRITE = 'overwrite',
  IGNORE = 'ignore'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
}

export interface LiabilityRecord {
  id: string;
  idempotencyKey: string;
  ticketId: string;
  ticketNumber?: string;
  customerName?: string;
  customerPhone?: string;
  agentName?: string;
  agentId?: string;
  department?: string;
  slaBreachType?: string;
  slaBreachDuration?: number;
  compensationAmount: number;
  compensationType?: string;
  escalationLevel?: number;
  transferCount?: number;
  responsibleParty?: string;
  liabilityReason?: string;
  status: WorkflowStatus;
  dataSources: DataSource[];
  sourceSessionSummaryId?: string;
  sourceSlaRuleId?: string;
  sourceCompensationApprovalId?: string;
  sourceSupplierStatementId?: string;
  sourceApprovalEmailId?: string;
  occurrenceDate: string;
  submittedBy?: string;
  submittedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  secondConfirmedBy?: string;
  secondConfirmedAt?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  isDirty: boolean;
  dirtyRecordTypes?: DirtyRecordType[];
  originalContent?: Record<string, unknown>;
  handlingOpinion?: string;
  isCorrected: boolean;
}

export interface HistoryRecord {
  id: string;
  recordId: string;
  operation: string;
  operationType: 'create' | 'update' | 'status_change' | 'duplicate_process' | 'correction' | 'export';
  operatorId: string;
  operatorName: string;
  operatorRole: UserRole;
  previousValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  changedFields: string[];
  changeReason?: string;
  duplicateStrategy?: DuplicateStrategy;
  sensitiveFieldsHandled?: string[];
  timestamp: string;
  ipAddress?: string;
}

export interface DirtyRecordLog {
  id: string;
  recordId: string;
  dirtyType: DirtyRecordType;
  fieldName?: string;
  expectedValue?: string;
  actualValue?: string;
  detectedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
}

export interface ExportLog {
  id: string;
  exportedBy: string;
  exportedByName: string;
  exportType: 'csv' | 'excel';
  recordCount: number;
  totalAmount: number;
  isMasked: boolean;
  maskedFields: string[];
  filters: Record<string, unknown>;
  exportedAt: string;
  checksum: string;
}

export interface ApiRequest<T = unknown> {
  user: User;
  body: T;
  idempotencyKey?: string;
}

export interface RolePermissions {
  visibleFields: string[];
  allowedActions: string[];
}
