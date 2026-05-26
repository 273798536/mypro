
export type TaskStatus = 'pending' | 'processing' | 'waiting_retry' | 'waiting_manual' | 'permanent_failed' | 'success' | 'closed';

export type SourceType = 'recharge' | 'refund' | 'store_transfer' | 'supplier_statement';

export type UserRole = 'admin' | 'finance_manager' | 'operator' | 'viewer';

export interface User {
  id: string;
  username: string;
  role: UserRole;
}

export interface AuthTokenPayload {
  userId: string;
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

declare module 'express' {
  interface Request {
    user?: AuthTokenPayload;
  }
}

export interface QueueTask {
  id: string;
  sourceType: SourceType;
  sourceFile: string;
  sourceLine: number;
  rawData: Record<string, unknown>;
  standardData: Record<string, unknown>;
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
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  diff: Record<string, unknown> | null;
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
  rawData: Record<string, unknown>;
  standardData: Record<string, unknown>;
}

export interface ImportResult {
  success: number;
  failed: number;
  duplicates: number;
  tasks: QueueTask[];
  errors: string[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    role: UserRole;
  };
}
