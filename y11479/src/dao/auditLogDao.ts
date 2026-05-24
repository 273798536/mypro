import { v4 as uuidv4 } from 'uuid';
import { runQuery, getOne, getAll } from '../database';
import { AuditLog, Role } from '../types';

function rowToAuditLog(row: any): AuditLog {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    role: row.role as Role,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    success: row.success === 1,
    denyReason: row.deny_reason,
    requestData: row.request_data,
    createdAt: row.created_at
  };
}

export async function createAuditLog(data: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog> {
  const id = uuidv4();
  const now = new Date().toISOString();

  await runQuery(`
    INSERT INTO audit_log (
      id, user_id, user_name, role, action, resource_type, resource_id,
      ip_address, user_agent, success, deny_reason, request_data, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.userId,
    data.userName,
    data.role,
    data.action,
    data.resourceType,
    data.resourceId,
    data.ipAddress,
    data.userAgent,
    data.success ? 1 : 0,
    data.denyReason,
    data.requestData,
    now
  ]);

  return getAuditLogById(id) as Promise<AuditLog>;
}

export async function getAuditLogById(id: string): Promise<AuditLog | null> {
  const row = await getOne('SELECT * FROM audit_log WHERE id = ?', [id]);
  return row ? rowToAuditLog(row) : null;
}

export async function getAuditLogs(options?: {
  userId?: string;
  resourceType?: string;
  success?: boolean;
  startTime?: string;
  endTime?: string;
  limit?: number;
  offset?: number;
}): Promise<AuditLog[]> {
  let sql = 'SELECT * FROM audit_log WHERE 1=1';
  const params: any[] = [];

  if (options?.userId) {
    sql += ' AND user_id = ?';
    params.push(options.userId);
  }

  if (options?.resourceType) {
    sql += ' AND resource_type = ?';
    params.push(options.resourceType);
  }

  if (options?.success !== undefined) {
    sql += ' AND success = ?';
    params.push(options.success ? 1 : 0);
  }

  if (options?.startTime) {
    sql += ' AND created_at >= ?';
    params.push(options.startTime);
  }

  if (options?.endTime) {
    sql += ' AND created_at <= ?';
    params.push(options.endTime);
  }

  sql += ' ORDER BY created_at DESC';

  if (options?.limit) {
    sql += ' LIMIT ?';
    params.push(options.limit);
    if (options.offset) {
      sql += ' OFFSET ?';
      params.push(options.offset);
    }
  }

  const rows = await getAll(sql, params);
  return rows.map(rowToAuditLog);
}

export async function getFailedAuditLogs(limit?: number): Promise<AuditLog[]> {
  return getAuditLogs({ success: false, limit });
}
