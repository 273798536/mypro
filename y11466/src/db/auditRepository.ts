import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AuditLog, AuditQuery } from '../types';

interface AuditLogRow {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string;
  changes: string | null;
  metadata: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

export class AuditRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  private serialize(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    return JSON.stringify(value);
  }

  private deserialize<T>(value: string | null): T | undefined {
    if (!value) return undefined;
    try {
      return JSON.parse(value) as T;
    } catch {
      return undefined;
    }
  }

  log(
    actor: string,
    action: string,
    entityType: string,
    entityId: string,
    changes?: Record<string, { old: unknown; new: unknown }>,
    metadata?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string
  ): void {
    const id = uuidv4();
    const stmt = this.db.prepare(`
      INSERT INTO audit_logs (
        id, actor, action, entity_type, entity_id, changes, metadata, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      actor,
      action,
      entityType,
      entityId,
      this.serialize(changes),
      this.serialize(metadata),
      ipAddress || null,
      userAgent || null
    );
  }

  find(query: AuditQuery = {}): AuditLog[] {
    const conditions: string[] = [];
    const params: Record<string, string> = {};

    if (query.entityType) {
      conditions.push('entity_type = @entityType');
      params.entityType = query.entityType;
    }

    if (query.entityId) {
      conditions.push('entity_id = @entityId');
      params.entityId = query.entityId;
    }

    if (query.actor) {
      conditions.push('actor = @actor');
      params.actor = query.actor;
    }

    if (query.action) {
      conditions.push('action = @action');
      params.action = query.action;
    }

    if (query.fromDate) {
      conditions.push('timestamp >= @fromDate');
      params.fromDate = query.fromDate;
    }

    if (query.toDate) {
      conditions.push('timestamp <= @toDate');
      params.toDate = query.toDate;
    }

    let sql = 'SELECT * FROM audit_logs';
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    sql += ' ORDER BY timestamp DESC';

    const rows = this.db.prepare(sql).all(params) as AuditLogRow[];

    return rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      actor: row.actor,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      changes: this.deserialize<Record<string, { old: unknown; new: unknown }>>(row.changes),
      metadata: this.deserialize<Record<string, unknown>>(row.metadata),
      ipAddress: row.ip_address || undefined,
      userAgent: row.user_agent || undefined
    }));
  }

  findByEntity(entityType: string, entityId: string): AuditLog[] {
    return this.find({ entityType, entityId });
  }

  findByActor(actor: string): AuditLog[] {
    return this.find({ actor });
  }
}
