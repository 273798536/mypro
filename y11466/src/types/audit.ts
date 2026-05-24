export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  
  changes?: Record<string, {
    old: unknown;
    new: unknown;
  }>;
  
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditQuery {
  entityType?: string;
  entityId?: string;
  actor?: string;
  action?: string;
  fromDate?: string;
  toDate?: string;
}
