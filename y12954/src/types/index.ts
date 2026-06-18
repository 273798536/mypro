export type AnomalyType =
  | 'INDEX_INVALID'
  | 'LOCK_WAIT_TIMEOUT'
  | 'SCHEMA_MISMATCH'
  | 'MISSING_METRICS'
  | 'COVERAGE_LOW'
  | 'DUPLICATE_INDEX';

export type AnomalySeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export type NextAction = 'PROVIDE_MATERIALS' | 'FIX_CALIBRATION' | 'REVIEW_INDEX' | 'NO_ACTION';

export type RunStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'PARTIAL' | 'FAILED';

export interface RunContext {
  runId: string;
  timestamp: number;
  operator: string;
  source: string;
  description?: string;
  parentRunId?: string;
}

export interface IndexSuggestion {
  id: string;
  runId: string;
  tableName: string;
  databaseName: string;
  indexName: string;
  indexColumns: string[];
  coveredColumns: string[];
  coverageRate: number;
  executionCount: number;
  avgLatencyMs: number;
  isInvalid: boolean;
  invalidReason?: string;
  sourceSystem: string;
  createdAt: number;
}

export interface AnomalyRecord {
  id: string;
  runId: string;
  suggestionId?: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  title: string;
  description: string;
  sourceRef: string;
  nextAction: NextAction;
  handlingOpinion: string;
  materialsRequired?: string[];
  isResolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
  resolutionNote?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SchemaSnapshot {
  id: string;
  runId: string;
  tableName: string;
  databaseName: string;
  schemaHash: string;
  columnDefinitions: ColumnDef[];
  indexDefinitions: IndexDef[];
  capturedAt: number;
}

export interface ColumnDef {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
}

export interface IndexDef {
  name: string;
  columns: string[];
  isUnique: boolean;
  isPrimary: boolean;
}

export interface SchemaDiff {
  tableName: string;
  databaseName: string;
  columnsAdded: ColumnDef[];
  columnsRemoved: ColumnDef[];
  columnsModified: { old: ColumnDef; new: ColumnDef }[];
  indexesAdded: IndexDef[];
  indexesRemoved: IndexDef[];
}

export interface MetricsSupplement {
  id: string;
  runId: string;
  suggestionId: string;
  metricName: string;
  metricValue: number;
  source: string;
  supplementedBy: string;
  supplementedAt: number;
}

export interface AuditLogEntry {
  id: string;
  runId: string;
  entityType: 'RUN' | 'SUGGESTION' | 'ANOMALY' | 'SCHEMA' | 'METRICS';
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'IMPORT' | 'RESOLVE';
  operator: string;
  beforeState?: unknown;
  afterState?: unknown;
  note?: string;
  timestamp: number;
}

export interface ExportOptions {
  includeResolved: boolean;
  format: 'xlsx' | 'csv';
  outputDir: string;
  explainAnomalies: boolean;
  includeDiff: boolean;
}

export type NextActionLabel = {
  [key in NextAction]: string;
};

export const NEXT_ACTION_LABELS: NextActionLabel = {
  PROVIDE_MATERIALS: '需补材料',
  FIX_CALIBRATION: '需改口径',
  REVIEW_INDEX: '需复核索引',
  NO_ACTION: '无需处理',
};
