export type QueryType = 'SELECT' | 'UPDATE' | 'DELETE' | 'INSERT';

export type IndexFailureType = 'full_table_scan' | 'index_ignored' | 'filesort' | 'temporary_table';

export interface IndexFailureInfo {
  detected: boolean;
  reason: string;
  type: IndexFailureType;
  explanation: string;
  businessImpact: string;
}

export interface SlowQuery {
  id: string;
  timestamp: string;
  sql: string;
  queryTime: number;
  rowsExamined: number;
  rowsSent: number;
  indexUsed: string | null;
  indexFailure: IndexFailureInfo;
  queryType: QueryType;
  tableName: string;
  dbName: string;
}

export type IndexType = 'PRIMARY' | 'UNIQUE' | 'NORMAL' | 'FULLTEXT';

export interface SchemaColumn {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
  comment?: string;
}

export interface SchemaIndex {
  name: string;
  columns: string[];
  type: IndexType;
}

export interface SchemaTable {
  name: string;
  engine: string;
  charset: string;
  columns: SchemaColumn[];
  indexes: SchemaIndex[];
  comment?: string;
}

export interface SchemaVersion {
  version: string;
  timestamp: string;
  description: string;
  migrationScript?: string;
  migrationName?: string;
  tables: SchemaTable[];
}

export type VerifyStatus = 'passed' | 'failed' | 'warning';

export type VerifyCategory = 'table_structure' | 'index' | 'data_integrity' | 'constraint';

export interface VerifyItem {
  id: string;
  name: string;
  category: VerifyCategory;
  status: VerifyStatus;
  description: string;
  detail?: string;
  relatedMigration?: string;
  businessImpact?: string;
}

export interface BackupVerifyResult {
  id: string;
  timestamp: string;
  schemaVersion: string;
  status: VerifyStatus;
  items: VerifyItem[];
}

export type ColumnChangeType = 'added' | 'removed' | 'modified';

export interface ColumnDiff {
  columnName: string;
  changeType: ColumnChangeType;
  oldColumn?: SchemaColumn;
  newColumn?: SchemaColumn;
  differences?: string[];
}

export type IndexChangeType = 'added' | 'removed' | 'modified';

export interface IndexDiff {
  indexName: string;
  changeType: IndexChangeType;
  oldIndex?: SchemaIndex;
  newIndex?: SchemaIndex;
  differences?: string[];
}

export interface TableDiff {
  tableName: string;
  changeType: 'added' | 'removed' | 'modified';
  columnDiffs: ColumnDiff[];
  indexDiffs: IndexDiff[];
  tableDifferences?: string[];
}

export interface SchemaCompareResult {
  oldVersion: string;
  newVersion: string;
  tableDiffs: TableDiff[];
  summary: {
    tablesAdded: number;
    tablesRemoved: number;
    tablesModified: number;
    columnsAdded: number;
    columnsRemoved: number;
    columnsModified: number;
    indexesAdded: number;
    indexesRemoved: number;
    indexesModified: number;
  };
}

export interface TimeDistributionItem {
  range: string;
  min: number;
  max: number;
  count: number;
  hasIndexFailure: number;
}

export interface QueryTypeStats {
  type: QueryType;
  count: number;
  avgTime: number;
  indexFailureCount: number;
}

export interface ReportData {
  generatedAt: string;
  runId: string;
  slowQueryCount: number;
  indexFailureCount: number;
  schemaVersion: string;
  backupVerifyStatus: VerifyStatus;
  timeDistribution: TimeDistributionItem[];
  topSlowQueries: SlowQuery[];
  indexFailureList: SlowQuery[];
  schemaDiffSummary?: SchemaCompareResult;
  backupVerifyItems: VerifyItem[];
  unusableRecords: {
    tableName: string;
    reason: string;
    impact: string;
    source: string;
  }[];
}
