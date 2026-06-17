import { db } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';
import type { AuditLog } from '../../shared/types.js';

interface AuditLogRow {
  id: string;
  ticket_id: string;
  version: number | null;
  action: string;
  operator: string;
  detail: string | null;
  created_at: string;
}

export class AuditLogRepository {
  private mapRow(row: AuditLogRow): AuditLog {
    return {
      id: row.id,
      ticketId: row.ticket_id,
      version: row.version ?? 0,
      action: row.action,
      operator: row.operator,
      detail: row.detail ?? '',
      createdAt: row.created_at,
    };
  }

  getById(id: string): AuditLog | null {
    const row = db.prepare('SELECT * FROM audit_logs WHERE id = ?').get(id) as AuditLogRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  findById(id: string): AuditLog | null {
    return this.getById(id);
  }

  list(): AuditLog[] {
    const rows = db
      .prepare('SELECT * FROM audit_logs ORDER BY created_at DESC')
      .all() as AuditLogRow[];
    return rows.map(row => this.mapRow(row));
  }

  getByTicketId(ticketId: string, options?: { limit?: number }): AuditLog[] {
    let sql = 'SELECT * FROM audit_logs WHERE ticket_id = ? ORDER BY created_at DESC';
    const params: unknown[] = [ticketId];

    if (options?.limit !== undefined) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const rows = db.prepare(sql).all(...params) as AuditLogRow[];
    return rows.map(row => this.mapRow(row));
  }

  findByTicketId(ticketId: string, options?: { limit?: number }): AuditLog[] {
    return this.getByTicketId(ticketId, options);
  }

  findAll(options?: { limit?: number; offset?: number }): AuditLog[] {
    let sql = 'SELECT * FROM audit_logs ORDER BY created_at DESC';
    const params: unknown[] = [];

    if (options?.limit !== undefined) {
      sql += ' LIMIT ?';
      params.push(options.limit);
      if (options?.offset !== undefined) {
        sql += ' OFFSET ?';
        params.push(options.offset);
      }
    }

    const rows = db.prepare(sql).all(...params) as AuditLogRow[];
    return rows.map(row => this.mapRow(row));
  }

  create(data: {
    id?: string;
    ticketId: string;
    version?: number;
    action: string;
    operator: string;
    detail?: string;
  }): AuditLog {
    const id = data.id ?? uuidv4();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO audit_logs (
        id, ticket_id, version, action, operator, detail, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      data.ticketId,
      data.version ?? null,
      data.action,
      data.operator,
      data.detail ?? null,
      now
    );
    return this.getById(id)!;
  }
}
