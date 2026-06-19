export interface ConnectionPoolData {
  id: string;
  timestamp: number;
  poolName: string;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  totalConnections: number;
  maxConnections: number;
  timeoutCount: number;
  errorRate: number;
  avgWaitTime: number;
  host?: string;
  port?: number;
  database?: string;
}

export interface DiagnosisResult {
  id: string;
  batchId: string;
  timestamp: number;
  poolName: string;
  severity: 'normal' | 'warning' | 'critical';
  issueType: string;
  description: string;
  affectedConnections: number[];
  suggestions: string[];
  rawData?: ConnectionPoolData;
}

export interface DiagnosisBatch {
  id: string;
  timestamp: number;
  operator: string;
  operatorId: string;
  dataHash: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  rawData: ConnectionPoolData[];
  results?: DiagnosisResult[];
}

export type OperationType = 'import' | 'diagnose' | 'modify' | 'confirm' | 'rollback' | 'permission' | 'dictionary_change';

export interface AuditLog {
  id: string;
  operationType: OperationType;
  operatorId: string;
  operatorName: string;
  timestamp: number;
  batchId?: string;
  description: string;
  reason?: string;
  snapshotBefore?: string;
  snapshotAfter?: string;
  approverId?: string;
  approverName?: string;
  changes?: AuditChange[];
}

export interface AuditChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface VersionSnapshot {
  id: string;
  batchId: string;
  data: string;
  checksum: string;
  createdAt: number;
}

export interface DataDictionary {
  id: string;
  key: string;
  value: string;
  description: string;
  version: number;
  createdBy: string;
  createdAt: number;
}

export interface DictionaryVersion {
  id: string;
  dictionaryId: string;
  oldValue: string;
  newValue: string;
  version: number;
  changedBy: string;
  changeTime: number;
  changeReason?: string;
}

export type PermissionStatus = 'pending' | 'approved' | 'rejected';

export interface PermissionRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requestedPermission: string;
  reason: string;
  status: PermissionStatus;
  approverId?: string;
  approverName?: string;
  approvedAt?: number;
  rejectReason?: string;
  createdAt: number;
}

export interface User {
  id: string;
  name: string;
  role: 'sre_oncall' | 'sre_reviewer' | 'admin';
  permissions: string;
}

export interface BoundaryCase {
  id: string;
  name: string;
  description: string;
  type: 'foreign_key' | 'leak' | 'timeout' | 'bad_data';
  testData: ConnectionPoolData[];
  expectedResult: {
    severity: 'normal' | 'warning' | 'critical';
    issueType: string;
  };
  isActive: boolean;
}

export interface VersionComparison {
  id1: string;
  id2: string;
  timestamp1: number;
  timestamp2: number;
  differences: ComparisonDiff[];
  summary: {
    totalChanges: number;
    criticalChanges: number;
    warningChanges: number;
  };
}

export interface ComparisonDiff {
  field: string;
  value1: any;
  value2: any;
  changeType: 'added' | 'removed' | 'modified';
  severity?: 'normal' | 'warning' | 'critical';
}

export interface DictionaryComparison {
  dictionaryId: string;
  key: string;
  version1: number;
  version2: number;
  oldValue: string;
  newValue: string;
  affectedDiagnoses: {
    batchId: string;
    oldConclusion: string;
    newConclusion: string;
    changed: boolean;
  }[];
}
