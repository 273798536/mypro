export type AnomalyType =
  | 'pagination_unstable'
  | 'backup_gap'
  | 'schema_drift'
  | 'slow_query_risk'
  | 'breaking_change';

export type Severity = 'critical' | 'warning' | 'info';

export interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: Severity;
  title: string;
  description: string;
  sourceMaterial: string;
  lineRange?: string;
  handlingOpinion: string;
}

export interface SchemaDiff {
  before: string;
  after: string;
  changes: string[];
  judgmentChanged: boolean;
}

export interface SlowQueryAttribution {
  query: string;
  beforeMs: number;
  afterMs: number;
  rootCause: string;
  beforeAfterDiff: string;
}

export interface Conclusion {
  version: number;
  content: string;
  createdAt: string;
}

export type OperationType = 'rerun' | 'supplement' | 'manual_confirm';

export interface Operation {
  id: string;
  type: OperationType;
  label: string;
  operator: string;
  timestamp: string;
  note: string;
  result: string;
}

export type ScriptStatus =
  | 'pending'
  | 'confirmed'
  | 'supplemented'
  | 'rerun'
  | 'manual_review';

export interface MigrationScript {
  id: string;
  batchId: string;
  fileName: string;
  sourceMaterial: string;
  sqlContent: string;
  anomalies: Anomaly[];
  schemaDiff?: SchemaDiff;
  slowQueryAttribution?: SlowQueryAttribution;
  conclusions: Conclusion[];
  operations: Operation[];
  status: ScriptStatus;
}

export interface MigrationBatch {
  id: string;
  name: string;
  importedAt: string;
  source: string;
  scriptIds: string[];
}

export interface FilterState {
  anomalyType: AnomalyType | 'all';
  severity: Severity | 'all';
  status: ScriptStatus | 'all';
  sourceMaterial: string;
}

export const ANOMALY_TYPE_LABELS: Record<AnomalyType, string> = {
  pagination_unstable: '分页顺序不稳定',
  backup_gap: '备份缺口',
  schema_drift: 'Schema 漂移',
  slow_query_risk: '慢查询风险',
  breaking_change: '破坏性变更',
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: '严重',
  warning: '警告',
  info: '信息',
};

export const STATUS_LABELS: Record<ScriptStatus, string> = {
  pending: '待处理',
  confirmed: '已确认',
  supplemented: '已补录',
  rerun: '已重跑',
  manual_review: '人工复核',
};

export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  rerun: '重复运行',
  supplement: '补录',
  manual_confirm: '人工确认',
};
