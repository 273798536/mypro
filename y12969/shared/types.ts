export type AuditRoundStatus = 'active' | 'archived';

export type RecordStatus = 'pending' | 'reviewing' | 'resolved' | 'confirmed';

export type AnomalyType = 'type_drift' | 'data_mismatch' | 'missing_record' | 'slow_query';

export type NextAction = 'supply_material' | 'adjust_caliber' | 'skip';

export interface BackupRecord {
  id: string;
  roundId: string;
  tableName: string;
  fieldName: string;
  backupType: string;
  reportType: string;
  backupSize: number;
  reportSize: number;
  hasTypeDrift: boolean;
  hasSizeMismatch: boolean;
  status: RecordStatus;
  createdAt: number;
  updatedAt: number;
}

export interface Anomaly {
  id: string;
  roundId: string;
  recordId: string;
  type: AnomalyType;
  description: string;
  evidence: string;
  suggestedAction: NextAction;
  interceptionRule?: string;
  status: RecordStatus;
  createdAt: number;
  updatedAt: number;
}

export interface IndexSuggestion {
  id: string;
  roundId: string;
  tableName: string;
  suggestedIndex: string;
  reason: string;
  expectedBenefit: string;
  priority: 'high' | 'medium' | 'low';
  relatedWorkOrder?: string;
  isActive: boolean;
  attributionUpdatedAt: number;
  createdAt: number;
}

export interface AuditRound {
  id: string;
  name: string;
  status: AuditRoundStatus;
  startedAt: number;
  archivedAt?: number;
  operator: string;
}

export interface StatusLog {
  id: string;
  roundId: string;
  entityType: 'record' | 'anomaly';
  entityId: string;
  fromStatus: RecordStatus;
  toStatus: RecordStatus;
  operator: string;
  remark: string;
  timestamp: number;
}

export interface CapacityTrendPoint {
  date: string;
  totalSize: number;
  backupSize: number;
  indexSize: number;
  explanation: string;
}

export interface TypeDriftDetail {
  recordId: string;
  tableName: string;
  fieldName: string;
  history: Array<{
    version: string;
    type: string;
    timestamp: number;
  }>;
  interceptionRule: string;
  impactScope: string[];
}

export interface ReportData {
  round: AuditRound;
  summary: {
    totalRecords: number;
    typeDriftCount: number;
    mismatchCount: number;
    slowQueryCount: number;
    resolvedCount: number;
  };
  records: BackupRecord[];
  anomalies: Anomaly[];
  suggestions: IndexSuggestion[];
  generatedAt: number;
}
