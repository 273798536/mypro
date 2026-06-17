export interface BackupField {
  name: string;
  expectedType: string;
  actualType: string;
  isDrifted: boolean;
  description: string;
}

export interface SlowQuery {
  id: string;
  query: string;
  executionTime: number;
  executeTime: string;
  tableName: string;
}

export interface BackupRecord {
  id: string;
  tableName: string;
  backupTime: string;
  source: string;
  recordCount: number;
  status: 'normal' | 'warning' | 'error';
  schemaVersion: string;
  fields: BackupField[];
  slowQueries: SlowQuery[];
  createdAt: string;
  updatedAt: string;
  driftCount: number;
}

export interface CorrectionHistory {
  id: string;
  backupId: string;
  fieldName: string;
  oldType: string;
  newType: string;
  reason: string;
  correctedAt: string;
  operator: string;
}

export interface IndexSuggestion {
  id: string;
  tableName: string;
  indexName: string;
  columns: string[];
  suggestion: string;
  impact: 'high' | 'medium' | 'low';
  status: 'pending' | 'applied' | 'rejected';
  relatedBackupId?: string;
}

export interface MetricData {
  date: string;
  totalBackups: number;
  driftedBackups: number;
  corrections: number;
  successRate: number;
}

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  status: 'idle' | 'running' | 'passed' | 'failed';
  steps: TestStep[];
  result?: string;
}

export interface TestStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  detail?: string;
}
