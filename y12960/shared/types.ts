export type ChangeType = 'ADD' | 'MODIFY' | 'DELETE' | 'RENAME';
export type RecordStatus = 'AVAILABLE' | 'PENDING_REVIEW' | 'UNAVAILABLE';
export type AnomalyType = 'NULL_VALUE' | 'DUPLICATE' | 'MIXED_NOTES' | 'BACKUP_GAP' | 'OTHER';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH';
export type UserRole = 'admin' | 'bi_analyst' | 'dev';

export interface SchemaField {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string;
  comment: string;
  length?: number;
  precision?: number;
}

export interface SourceInfo {
  ticketNo: string;
  businessDesc: string;
  materialLink: string;
  requester: string;
}

export interface Anomaly {
  id?: string;
  type: AnomalyType;
  description: string;
  severity: Severity;
  detectedAt?: string;
}

export interface MigrationStatus {
  synced: boolean;
  lastSyncAt: string;
  sourceWriteBack: string[];
}

export interface ChangeRecord {
  id: string;
  recordNo: string;
  tableName: string;
  fieldName: string;
  changeType: ChangeType;
  status: RecordStatus;
  anomalies: Anomaly[];
  sourceInfo: SourceInfo;
  schemaBefore: SchemaField;
  schemaAfter: SchemaField;
  handlingOpinion: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChangeRecordListItem extends Omit<ChangeRecord, 'schemaBefore' | 'schemaAfter' | 'anomalies'> {
  anomalyCount: number;
  hasHighSeverity: boolean;
}

export interface SchemaVersion {
  id: string;
  version: string;
  tableName: string;
  fields: SchemaField[];
  createdAt: string;
  createdBy: string;
}

export interface SchemaDiff {
  type: 'ADD' | 'DELETE' | 'MODIFY';
  fieldName: string;
  property?: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface SchemaCompareResult {
  version1: string;
  version2: string;
  tableName: string;
  addedFields: SchemaField[];
  deletedFields: SchemaField[];
  modifiedFields: Array<{
    field: SchemaField;
    changes: SchemaDiff[];
  }>;
  statistics: {
    total: number;
    added: number;
    deleted: number;
    modified: number;
  };
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName?: string;
  action: string;
  resource: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface ImportResult {
  total: number;
  success: number;
  failed: number;
  duplicates: number;
  anomalies: number;
  records: ChangeRecord[];
  errors: string[];
}

export interface FilterParams {
  status?: RecordStatus;
  anomalyType?: AnomalyType;
  startDate?: string;
  endDate?: string;
  createdBy?: string;
  tableName?: string;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
