import { getDb, generateId } from '../db';
import type { AuditLog, PaginationParams, PaginatedResponse } from '../../shared/types';

export class AuditService {
  private db = getDb();

  log(action: string, entityType: string, entityId: string, userId: string, details: string): void {
    const now = new Date().toISOString();
    const id = generateId('log');
    
    const stmt = this.db.prepare(`
      INSERT INTO audit_logs (id, action, entity_type, entity_id, user_id, details, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, action, entityType, entityId, userId, details, now);
  }

  findAll(params: PaginationParams & { entityType?: string; action?: string } = {}): PaginatedResponse<AuditLog> {
    const { page = 1, pageSize = 50, entityType, action } = params;
    const offset = (page - 1) * pageSize;
    
    const whereClauses: string[] = [];
    const queryParams: unknown[] = [];

    if (entityType) {
      whereClauses.push('entity_type = ?');
      queryParams.push(entityType);
    }

    if (action) {
      whereClauses.push('action = ?');
      queryParams.push(action);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM audit_logs ${whereSql}
    `);
    const { count } = countStmt.get(...queryParams) as { count: number };

    const stmt = this.db.prepare(`
      SELECT * FROM audit_logs ${whereSql}
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(...queryParams, pageSize, offset) as Record<string, unknown>[];
    
    const data = rows.map(row => ({
      id: row.id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      userId: row.user_id,
      details: row.details,
      timestamp: row.timestamp,
    })) as AuditLog[];

    return {
      data,
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
    };
  }
}

export default AuditService;
