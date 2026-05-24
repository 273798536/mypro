import { BaseEntity } from './common';

export type TaskStatus = 
  | 'pending' 
  | 'queued' 
  | 'running' 
  | 'completed' 
  | 'failed_retry' 
  | 'failed_manual' 
  | 'failed_permanent' 
  | 'cancelled';

export type TaskType = 'import' | 'check' | 'fix' | 'export' | 'report' | 'sync';

export interface Task extends BaseEntity {
  taskId: string;
  type: TaskType;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  
  attempts: number;
  maxAttempts: number;
  
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  
  errorMessage?: string;
  errorStack?: string;
  errorCode?: string;
  
  retryAfter?: string;
  assignedTo?: string;
  
  parentTaskId?: string;
  dependsOn?: string[];
}

export interface TaskLog {
  id: string;
  taskId: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  details?: Record<string, unknown>;
}
