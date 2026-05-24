import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { CheckResult } from '../types';

interface CheckResultRow {
  id: string;
  check_id: string;
  type: string;
  severity: string;
  message: string;
  details: string | null;
  related_entities: string | null;
  fixed: number;
  fixed_at: string | null;
  fixed_by: string | null;
  created_at: string;
}

export class CheckRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  private generateId(): string {
    return uuidv4();
  }

  private now(): string {
    return dayjs().toISOString();
  }

  private serialize(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    return JSON.stringify(value);
  }

  private deserialize<T>(value: string | null): T | null {
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  create(check: Omit<CheckResult, 'id' | 'createdAt'>): CheckResult {
    const id = this.generateId();
    const now = this.now();

    const stmt = this.db.prepare(`
      INSERT INTO check_results (
        id, check_id, type, severity, message, details, related_entities,
        fixed, fixed_at, fixed_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, ?)
    `);

    stmt.run(
      id,
      check.checkId,
      check.type,
      check.severity,
      check.message,
      this.serialize(check.details),
      this.serialize(check.relatedEntities),
      now
    );

    return this.findById(id)!;
  }

  markFixed(checkId: string, fixedBy: string): CheckResult | null {
    const now = this.now();
    const stmt = this.db.prepare(`
      UPDATE check_results 
      SET fixed = 1, fixed_at = ?, fixed_by = ? 
      WHERE check_id = ?
    `);

    const result = stmt.run(now, fixedBy, checkId);
    if (result.changes === 0) return null;

    return this.findByCheckId(checkId);
  }

  findById(id: string): CheckResult | null {
    const row = this.db.prepare(
      'SELECT * FROM check_results WHERE id = ?'
    ).get(id) as CheckResultRow | undefined;

    return row ? this.rowToEntity(row) : null;
  }

  findByCheckId(checkId: string): CheckResult | null {
    const row = this.db.prepare(
      'SELECT * FROM check_results WHERE check_id = ?'
    ).get(checkId) as CheckResultRow | undefined;

    return row ? this.rowToEntity(row) : null;
  }

  findAll(includeFixed = false): CheckResult[] {
    let sql = 'SELECT * FROM check_results';
    if (!includeFixed) {
      sql += ' WHERE fixed = 0';
    }
    sql += ' ORDER BY created_at DESC';

    const rows = this.db.prepare(sql).all() as CheckResultRow[];
    return rows.map(row => this.rowToEntity(row));
  }

  findByType(type: string, includeFixed = false): CheckResult[] {
    let sql = 'SELECT * FROM check_results WHERE type = ?';
    if (!includeFixed) {
      sql += ' AND fixed = 0';
    }
    sql += ' ORDER BY created_at DESC';

    const rows = this.db.prepare(sql).all(type) as CheckResultRow[];
    return rows.map(row => this.rowToEntity(row));
  }

  findBySeverity(
    severity: CheckResult['severity'],
    includeFixed = false
  ): CheckResult[] {
    let sql = 'SELECT * FROM check_results WHERE severity = ?';
    if (!includeFixed) {
      sql += ' AND fixed = 0';
    }
    sql += ' ORDER BY created_at DESC';

    const rows = this.db.prepare(sql).all(severity) as CheckResultRow[];
    return rows.map(row => this.rowToEntity(row));
  }

  private rowToEntity(row: CheckResultRow): CheckResult {
    return {
      checkId: row.check_id,
      type: row.type,
      severity: row.severity as CheckResult['severity'],
      message: row.message,
      details: this.deserialize<Record<string, unknown>>(row.details) || {},
      relatedEntities: this.deserialize<{ type: string; id: string }[]>(row.related_entities) || [],
      fixed: row.fixed === 1,
      fixedAt: row.fixed_at || undefined,
      fixedBy: row.fixed_by || undefined,
      createdAt: row.created_at
    };
  }

  delete(checkId: string): boolean {
    const result = this.db.prepare(
      'DELETE FROM check_results WHERE check_id = ?'
    ).run(checkId);
    return result.changes > 0;
  }
}
