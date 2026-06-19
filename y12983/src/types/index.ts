export type GapStatus = 'pending' | 'processing' | 'fixed' | 'ignored';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type GapType = 'sampling' | 'migration' | 'other';
export type HistoryAction =
  | 'created'
  | 'status_changed'
  | 'fixed'
  | 'concluded'
  | 'snapshot_added'
  | 'permission_added'
  | 'duplicate_detected'
  | 'merged';

export interface GapReport {
  id: string;
  title: string;
  status: GapStatus;
  severity: Severity;
  gapType: GapType;
  tableName: string;
  businessLine: string;
  discoveredAt: string;
  description: string;
  conclusion?: string;
  concludedBy?: string;
  concludedAt?: string;
  source: string;
  fingerprint: string;
  affectedRows?: number;
  dataGapStart?: string;
  dataGapEnd?: string;
}

export interface TableSnapshot {
  id: string;
  gapId: string;
  tableName: string;
  version: string;
  createdAt: string;
  schema: TableSchema;
  ddl: string;
}

export interface TableSchema {
  columns: TableColumn[];
  indexes: TableIndex[];
  partitionBy?: string;
}

export interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
  comment?: string;
}

export interface TableIndex {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface PermissionItem {
  id: string;
  gapId: string;
  roleName: string;
  permission: string;
  resource: string;
  grantedBy: string;
  grantedAt: string;
  description?: string;
}

export interface FixRecord {
  id: string;
  gapId: string;
  fixType: string;
  solution: string;
  supplementData?: string;
  remark?: string;
  operator: string;
  operatedAt: string;
}

export interface HistoryLog {
  id: string;
  gapId: string;
  action: HistoryAction;
  operator: string;
  operatedAt: string;
  detail: string;
  fromStatus?: GapStatus;
  toStatus?: GapStatus;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  status?: GapStatus;
  severity?: Severity;
  gapType?: GapType;
  tableName?: string;
  businessLine?: string;
  keyword?: string;
}

export interface PagedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateGapData {
  title: string;
  severity: Severity;
  gapType: GapType;
  tableName: string;
  businessLine: string;
  description: string;
  source: string;
  affectedRows?: number;
  dataGapStart?: string;
  dataGapEnd?: string;
}

export interface UpdateGapData {
  title?: string;
  status?: GapStatus;
  severity?: Severity;
  description?: string;
  conclusion?: string;
}

export interface DuplicateResult {
  gap: GapReport;
  similarity: number;
  reason: string;
}
