import { db } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';
import type { Ticket, TicketStatus, DashboardStats } from '../../shared/types.js';

interface TicketRow {
  id: string;
  ticket_no: string;
  customer_issue: string;
  customer_name: string;
  status: TicketStatus;
  current_version: number;
  latest_version: number;
  locked_version: number | null;
  has_sample_leak: number;
  has_manual_mark: number;
  created_at: string;
  updated_at: string;
}

export class TicketRepository {
  private mapRow(row: TicketRow): Ticket {
    return {
      id: row.id,
      ticketNo: row.ticket_no,
      customerIssue: row.customer_issue,
      customerName: row.customer_name,
      status: row.status,
      currentVersion: row.current_version,
      latestVersion: row.latest_version,
      lockedVersion: row.locked_version,
      hasSampleLeak: row.has_sample_leak === 1,
      hasManualMark: row.has_manual_mark === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  getById(id: string): Ticket | null {
    const row = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id) as TicketRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  findById(id: string): Ticket | null {
    return this.getById(id);
  }

  list(): Ticket[] {
    const rows = db.prepare('SELECT * FROM tickets ORDER BY updated_at DESC').all() as TicketRow[];
    return rows.map(row => this.mapRow(row));
  }

  findAll(options?: { status?: TicketStatus; limit?: number; offset?: number }): Ticket[] {
    let sql = 'SELECT * FROM tickets';
    const params: unknown[] = [];

    if (options?.status) {
      sql += ' WHERE status = ?';
      params.push(options.status);
    }

    sql += ' ORDER BY updated_at DESC';

    if (options?.limit !== undefined) {
      sql += ' LIMIT ?';
      params.push(options.limit);
      if (options?.offset !== undefined) {
        sql += ' OFFSET ?';
        params.push(options.offset);
      }
    }

    const rows = db.prepare(sql).all(...params) as TicketRow[];
    return rows.map(row => this.mapRow(row));
  }

  countAll(status?: TicketStatus): number {
    let sql = 'SELECT COUNT(*) as count FROM tickets';
    const params: unknown[] = [];

    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }

    const result = db.prepare(sql).get(...params) as { count: number };
    return result.count;
  }

  filterByStatus(status: TicketStatus): Ticket[] {
    const rows = db
      .prepare('SELECT * FROM tickets WHERE status = ? ORDER BY updated_at DESC')
      .all(status) as TicketRow[];
    return rows.map(row => this.mapRow(row));
  }

  filterByHasSampleLeak(hasSampleLeak: boolean): Ticket[] {
    const rows = db
      .prepare('SELECT * FROM tickets WHERE has_sample_leak = ? ORDER BY updated_at DESC')
      .all(hasSampleLeak ? 1 : 0) as TicketRow[];
    return rows.map(row => this.mapRow(row));
  }

  filterByHasManualMark(hasManualMark: boolean): Ticket[] {
    const rows = db
      .prepare('SELECT * FROM tickets WHERE has_manual_mark = ? ORDER BY updated_at DESC')
      .all(hasManualMark ? 1 : 0) as TicketRow[];
    return rows.map(row => this.mapRow(row));
  }

  getStats(): DashboardStats {
    const result = db.prepare(`
      SELECT 
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'need_evidence' THEN 1 ELSE 0 END) as need_evidence,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'locked' THEN 1 ELSE 0 END) as locked
      FROM tickets
    `).get() as { 
      pending: number; 
      processing: number; 
      need_evidence: number; 
      completed: number; 
      locked: number 
    };

    return {
      pending: result.pending || 0,
      processing: result.processing || 0,
      needEvidence: result.need_evidence || 0,
      completed: result.completed || 0,
      locked: result.locked || 0,
    };
  }

  create(data: {
    id?: string;
    ticketNo: string;
    customerIssue: string;
    customerName: string;
    status?: TicketStatus;
    currentVersion?: number;
    latestVersion?: number;
    hasSampleLeak?: boolean;
    hasManualMark?: boolean;
  }): Ticket {
    const id = data.id ?? uuidv4();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO tickets (
        id, ticket_no, customer_issue, customer_name, status,
        current_version, latest_version, has_sample_leak, has_manual_mark,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      data.ticketNo,
      data.customerIssue,
      data.customerName,
      data.status ?? 'pending',
      data.currentVersion ?? 1,
      data.latestVersion ?? 1,
      data.hasSampleLeak ? 1 : 0,
      data.hasManualMark ? 1 : 0,
      now,
      now
    );
    return this.getById(id)!;
  }

  update(id: string, data: {
    ticketNo?: string;
    customerIssue?: string;
    customerName?: string;
    status?: TicketStatus;
    currentVersion?: number;
    latestVersion?: number;
    lockedVersion?: number | null;
    hasSampleLeak?: boolean;
    hasManualMark?: boolean;
  }): Ticket | null {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.ticketNo !== undefined) {
      fields.push('ticket_no = ?');
      values.push(data.ticketNo);
    }
    if (data.customerIssue !== undefined) {
      fields.push('customer_issue = ?');
      values.push(data.customerIssue);
    }
    if (data.customerName !== undefined) {
      fields.push('customer_name = ?');
      values.push(data.customerName);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }
    if (data.currentVersion !== undefined) {
      fields.push('current_version = ?');
      values.push(data.currentVersion);
    }
    if (data.latestVersion !== undefined) {
      fields.push('latest_version = ?');
      values.push(data.latestVersion);
    }
    if (data.lockedVersion !== undefined) {
      fields.push('locked_version = ?');
      values.push(data.lockedVersion);
    }
    if (data.hasSampleLeak !== undefined) {
      fields.push('has_sample_leak = ?');
      values.push(data.hasSampleLeak ? 1 : 0);
    }
    if (data.hasManualMark !== undefined) {
      fields.push('has_manual_mark = ?');
      values.push(data.hasManualMark ? 1 : 0);
    }

    if (fields.length === 0) {
      return this.getById(id);
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = db.prepare(`UPDATE tickets SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getById(id);
  }

  updateStatus(id: string, status: TicketStatus): void {
    db.prepare('UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?')
      .run(status, new Date().toISOString(), id);
  }

  updateVersions(id: string, data: {
    currentVersion?: number;
    latestVersion?: number;
    lockedVersion?: number | null;
  }): void {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.currentVersion !== undefined) {
      fields.push('current_version = ?');
      values.push(data.currentVersion);
    }
    if (data.latestVersion !== undefined) {
      fields.push('latest_version = ?');
      values.push(data.latestVersion);
    }
    if (data.lockedVersion !== undefined) {
      fields.push('locked_version = ?');
      values.push(data.lockedVersion);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    db.prepare(`UPDATE tickets SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  updateFlags(id: string, flags: { hasSampleLeak?: boolean; hasManualMark?: boolean }): void {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (flags.hasSampleLeak !== undefined) {
      fields.push('has_sample_leak = ?');
      values.push(flags.hasSampleLeak ? 1 : 0);
    }
    if (flags.hasManualMark !== undefined) {
      fields.push('has_manual_mark = ?');
      values.push(flags.hasManualMark ? 1 : 0);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    db.prepare(`UPDATE tickets SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }
}
