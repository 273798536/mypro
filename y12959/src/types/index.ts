export type ConflictSeverity = 'critical' | 'warning' | 'info';

export type ConflictStatus =
  | 'pending'
  | 'in_progress'
  | 'resolved'
  | 'ignored'
  | 'unavailable';

export type ResolveStrategy = 'skip' | 'overwrite' | 'merge' | 'manual';

export type OperationType =
  | 'view'
  | 'resolve'
  | 'backup'
  | 'rollback'
  | 'export'
  | 'assign'
  | 'permission_change';

export type PermissionKey =
  | 'conflict:view'
  | 'conflict:resolve'
  | 'conflict:assign'
  | 'backup:create'
  | 'rollback:update'
  | 'history:view'
  | 'history:audit_chain'
  | 'export:run'
  | 'user:manage';

export type ExportFormat = 'pdf' | 'xlsx' | 'csv';

export type ExportScope = 'current_filter' | 'all' | 'single';

export interface ConflictRecord {
  id: string;
  migrationTaskId: string;
  migrationTaskName: string;
  orderNo: string;
  idempotentKey: string;
  idempotentKeyType: 'order_no' | 'biz_id' | 'unique_hash' | 'composite';
  conflictType: 'duplicate_execution' | 'schema_mismatch' | 'key_collision';
  severity: ConflictSeverity;
  firstExecuteTime: string;
  lastExecuteTime: string;
  duplicateAttempts: number;
  status: ConflictStatus;
  assignee?: string;
  currentOwner: string;
  snapshotBeforeId: string;
  snapshotAfterId: string;
  executionTrailIds: string[];
  resolveInfo?: ResolveInfo;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  unavailableReasons?: string[];
}

export interface TableSnapshot {
  id: string;
  snapshotName: string;
  tableName: string;
  capturedAt: string;
  migrationVersion: string;
  fields: SnapshotField[];
  rowCount: number;
  checksum: string;
}

export interface SnapshotField {
  name: string;
  dataType: string;
  nullable: boolean;
  defaultValue?: string;
  comment?: string;
  ordinalPosition: number;
  changeType?: 'added' | 'removed' | 'modified' | 'unchanged';
  oldValue?: string;
  newValue?: string;
  impactNote?: string;
}

export interface ExecutionTrail {
  id: string;
  conflictId: string;
  attemptNo: number;
  executedAt: string;
  nodeName: string;
  operator: string;
  inputSummary: Record<string, unknown>;
  result: 'blocked' | 'failed' | 'partial';
  blockReason: string;
  blockRule: string;
  fullLogPath: string;
}

export interface ResolveInfo {
  strategy: ResolveStrategy;
  resolvedAt: string;
  resolvedBy: string;
  remark: string;
  backupRecordId?: string;
  rollbackRecordId?: string;
  changes: Record<string, { before: unknown; after: unknown }>;
}

export interface BackupRecord {
  id: string;
  conflictId: string;
  linkedResolveInfoId: string;
  createdAt: string;
  createdBy: string;
  backupScope: 'full_row' | 'changed_fields' | 'custom';
  backupData: Record<string, unknown>;
  restored: boolean;
  restoredAt?: string;
}

export interface RollbackRecord {
  id: string;
  conflictId: string;
  linkedBackupId: string;
  linkedResolveInfoId: string;
  updatedAt: string;
  updatedBy: string;
  rollbackStatus: 'pending' | 'applied' | 'verified' | 'failed';
  fieldRollbacks: Record<
    string,
    { from: unknown; to: unknown; appliedAt?: string }
  >;
}

export interface UserRole {
  id: string;
  name: 'audit_readonly' | 'data_ops' | 'admin';
  displayName: string;
  permissions: PermissionKey[];
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  roleIds: string[];
  effectivePermissions: PermissionKey[];
  lastPermissionChangeAt?: string;
}

export interface PermissionSnapshot {
  id: string;
  operationId: string;
  userId: string;
  capturedAt: string;
  roleIdsAtThatTime: string[];
  permissionsAtThatTime: PermissionKey[];
  permissionSource: 'role_grant' | 'temporary_authorization' | 'inheritance';
  valid: boolean;
}

export interface OperationLog {
  id: string;
  conflictId?: string;
  operationType: OperationType;
  operatorId: string;
  operatorName: string;
  operatedAt: string;
  permissionSnapshotId: string;
  detail: Record<string, unknown>;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  relatedBackupId?: string;
  relatedRollbackId?: string;
  remark?: string;
}

export interface ExportJob {
  id: string;
  format: ExportFormat;
  scope: ExportScope;
  filterCriteria?: Record<string, unknown>;
  singleConflictId?: string;
  includeExplanations: boolean;
  includeCharts: boolean;
  includeSnapshots: boolean;
  includeAuditSummary: boolean;
  status: 'queued' | 'generating' | 'done' | 'failed';
  createdAt: string;
  createdBy: string;
  completedAt?: string;
  fileName: string;
  fileSizeKb?: number;
  downloadCount: number;
}

export interface ResolveResult {
  resolveInfoId: string;
  backupRecordId: string;
  rollbackRecordId: string;
  operationLogId: string;
  permissionSnapshotId: string;
  conflictId: string;
  conflictStatus: ConflictStatus;
}

export interface ConflictListParams {
  page?: number;
  pageSize?: number;
  severity?: ConflictSeverity[];
  status?: ConflictStatus[];
  idempotentKeyType?: ConflictRecord['idempotentKeyType'][];
  keyword?: string;
  assignee?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'createdAt' | 'severity' | 'lastExecuteTime' | 'duplicateAttempts';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FieldDiff {
  field: SnapshotField;
  before?: SnapshotField;
  after?: SnapshotField;
  changeType: SnapshotField['changeType'];
}

export interface FilterPreset {
  id: string;
  name: string;
  description: string;
  params: ConflictListParams;
}

export interface BlockReasonDetail {
  summary: string;
  whyBlocked: string;
  typical: string;
  suggestion: string;
}

export type ExplanationContextType =
  | 'chart_hover'
  | 'snapshot_diff'
  | 'trail_node'
  | 'idempotent_key';

export interface ExplanationContextData {
  chart_hover?: {
    metricName: string;
    value: number | string;
    timestamp?: string;
    breakdown?: Record<string, number>;
  };
  snapshot_diff?: {
    fieldName: string;
    changeType: SnapshotField['changeType'];
    oldValue?: string;
    newValue?: string;
    tableName: string;
  };
  trail_node?: {
    attemptNo: number;
    nodeName: string;
    result: ExecutionTrail['result'];
    blockReason: string;
    blockRule: string;
  };
  idempotent_key?: {
    key: string;
    keyType: ConflictRecord['idempotentKeyType'];
    attempts: number;
    firstTime: string;
    lastTime: string;
  };
}

export interface GeneratedExplanation {
  title: string;
  summary: string;
  detail: string;
  suggestions: string[];
}

export type ResolveStep = 'permit' | 'backup' | 'rollback' | 'done';
export type ResolveStatus = 'pending' | 'active' | 'completed' | 'error';
