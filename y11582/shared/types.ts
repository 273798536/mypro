
export type TaskStatus = 'pending' | 'processing' | 'waiting_retry' | 'waiting_manual' | 'permanent_failed' | 'success' | 'closed';

export type SourceType = 'recharge' | 'refund' | 'store_transfer' | 'supplier_statement';

export interface QueueTask {
  id: string;
  sourceType: SourceType;
  sourceFile: string;
  sourceLine: number;
  rawData: Record<string, any>;
  standardData: Record<string, any>;
  status: TaskStatus;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
}

export interface OperationHistory {
  id: string;
  taskId: string;
  operation: string;
  operator: string;
  beforeState: Record<string, any> | null;
  afterState: Record<string, any> | null;
  diff: Record<string, any> | null;
  remark?: string;
  createdAt: string;
}

export interface OriginalEvidence {
  id: string;
  taskId: string;
  fileName: string;
  fileHash: string;
  originalContent: string;
  lineNumber: number;
  createdAt: string;
}

export interface DashboardStats {
  total: number;
  pending: number;
  processing: number;
  waitingRetry: number;
  waitingManual: number;
  permanentFailed: number;
  success: number;
  closed: number;
}

export interface RetryCategory {
  category: string;
  count: number;
  status: TaskStatus;
}

export interface CreateTaskRequest {
  sourceType: SourceType;
  sourceFile: string;
  sourceLine: number;
  rawData: Record<string, any>;
  standardData: Record<string, any>;
}

export interface ImportResult {
  success: number;
  failed: number;
  duplicates: number;
  tasks: QueueTask[];
  errors: string[];
}
