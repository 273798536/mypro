export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface ImportSource {
  type: 'sample_flow' | 'size_modification' | 'fabric_inout' | 'refund' | 'inventory';
  fileName: string;
  sheetName?: string;
  importBatchId: string;
  importTime: string;
  importedBy: string;
}

export interface ImportRecord extends BaseEntity {
  batchId: string;
  sourceType: ImportSource['type'];
  fileName: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  skippedRows: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  conflictStrategy: 'ignore' | 'overwrite' | 'append';
}

export type ConflictStrategy = 'ignore' | 'overwrite' | 'append';

export interface ImportResult {
  batchId: string;
  sourceType: ImportSource['type'];
  total: number;
  success: number;
  failed: number;
  skipped: number;
  errors: ImportError[];
  warnings: string[];
}

export interface ImportError {
  rowNumber: number;
  field?: string;
  message: string;
  code: string;
  data?: Record<string, unknown>;
}

export interface CheckResult {
  checkId: string;
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  details: Record<string, unknown>;
  relatedEntities: {
    type: string;
    id: string;
  }[];
  fixed: boolean;
  fixedAt?: string;
  fixedBy?: string;
  createdAt: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: Pagination;
}

export interface ImportOptions {
  sourceType: ImportSource['type'];
  filePath: string;
  sheetName?: string;
  conflictStrategy: ConflictStrategy;
  importedBy: string;
  dryRun?: boolean;
}

export interface CheckOptions {
  checkTypes?: string[];
  sampleNos?: string[];
  styleNos?: string[];
}

export interface FixResult {
  checkId: string;
  fixed: boolean;
  message: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface ExportOptions {
  format: 'xlsx' | 'csv' | 'json';
  outputDir?: string;
  includeSource?: boolean;
  includeHistory?: boolean;
}

export interface ReportOptions {
  format?: 'text' | 'markdown' | 'html';
}

export enum ExitCode {
  SUCCESS = 0,
  ERROR = 1,
  INVALID_ARGS = 2,
  NOT_INITIALIZED = 3,
  IMPORT_FAILED = 4,
  CHECK_FAILED = 5,
  NO_DATA = 6
}
