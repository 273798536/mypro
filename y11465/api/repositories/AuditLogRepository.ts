import { getDb } from '../db/connection';
import { v4 as uuidv4 } from 'uuid';
import type { AuditLog } from '../../shared/types';

export class AuditLogRepository {
  private db = getDb();

  create(params: {
    entityType: string;
    entityId: string;
    action: string;
    beforeData?: Record<string, any>;
    afterData?: Record<string, any>;
    reason?: string;
    operatedBy: string;
  }): AuditLog {
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO audit_logs (id, entity_type, entity_id, action, before_data, after_data, reason, operated_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      params.entityType,
      params.entityId,
      params.action,
      params.beforeData ? JSON.stringify(params.beforeData) : null,
      params.afterData ? JSON.stringify(params.afterData) : null,
      params.reason || null,
      params.operatedBy,
      now
    );

    return this.findById(id)!;
  }

  findById(id: string): AuditLog | null {
    const stmt = this.db.prepare('SELECT * FROM audit_logs WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  findByEntity(entityType: string, entityId: string): AuditLog[] {
    const stmt = this.db.prepare(`
      SELECT * FROM audit_logs 
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(entityType, entityId) as any[];
    return rows.map(row => this.mapRow(row));
  }

  findAll(params: { page?: number; pageSize?: number; entityType?: string; operatedBy?: string } = {}): { data: AuditLog[]; total: number } {
    const { page = 1, pageSize = 20, entityType, operatedBy } = params;
    const offset = (page - 1) * pageSize;

    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];

    if (entityType) {
      whereClause += ' AND entity_type = ?';
      queryParams.push(entityType.toUpperCase());
    }
    if (operatedBy) {
      whereClause += ' AND operated_by = ?';
      queryParams.push(operatedBy);
    }

    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM audit_logs ${whereClause}`);
    const { count } = countStmt.get(...queryParams) as { count: number };

    const dataStmt = this.db.prepare(`
      SELECT * FROM audit_logs ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = dataStmt.all(...queryParams, pageSize, offset) as any[];

    return {
      data: rows.map(row => this.mapRow(row)),
      total: count
    };
  }

  private mapRow(row: any): AuditLog {
    return {
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      action: row.action,
      beforeData: row.before_data ? JSON.parse(row.before_data) : undefined,
      afterData: row.after_data ? JSON.parse(row.after_data) : undefined,
      reason: row.reason,
      operatedBy: row.operated_by,
      createdAt: row.created_at
    };
  }
}

export default new AuditLogRepository();
