import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import type { AuditLog } from '../../shared/types';

interface DbAuditLog {
  id: string;
  user_id: string;
  action: string;
  resource: string;
  details: string;
  created_at: string;
}

export class AuditLogRepository {
  private mapToAuditLog(dbRecord: DbAuditLog & { user_name?: string }): AuditLog {
    return {
      id: dbRecord.id,
      userId: dbRecord.user_id,
      userName: dbRecord.user_name,
      action: dbRecord.action,
      resource: dbRecord.resource,
      details: dbRecord.details ? JSON.parse(dbRecord.details) : {},
      createdAt: dbRecord.created_at,
    };
  }

  async findAll(
    page: number = 1,
    pageSize: number = 50
  ): Promise<{ data: AuditLog[]; total: number }> {
    const countResult = db
      .prepare('SELECT COUNT(*) as count FROM audit_log')
      .get() as { count: number };
    const total = countResult.count;

    const offset = (page - 1) * pageSize;
    const records = db
      .prepare(
        `SELECT al.*, u.display_name as user_name
         FROM audit_log al
         LEFT JOIN user u ON u.id = al.user_id
         ORDER BY al.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(pageSize, offset) as Array<DbAuditLog & { user_name: string }>;

    return {
      data: records.map((r) => this.mapToAuditLog(r)),
      total,
    };
  }

  async create(
    data: Omit<AuditLog, 'id' | 'createdAt' | 'userName'>
  ): Promise<AuditLog> {
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO audit_log (id, user_id, action, resource, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, data.userId, data.action, data.resource, JSON.stringify(data.details), now);

    const record = db
      .prepare(
        `SELECT al.*, u.display_name as user_name
         FROM audit_log al
         LEFT JOIN user u ON u.id = al.user_id
         WHERE al.id = ?`
      )
      .get(id) as DbAuditLog & { user_name: string };

    return this.mapToAuditLog(record);
  }
}

export const auditLogRepository = new AuditLogRepository();
