import db from '../db/index.js';
import type { ExceptionRecord, ActionLog } from '../../shared/types/index.js';

interface ExceptionQueryParams {
  type?: string;
  level?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

function mapExceptionRecord(row: any): ExceptionRecord {
  let affectedRunIds: string[] = [];
  try {
    if (row.affected_run_ids) {
      affectedRunIds = JSON.parse(row.affected_run_ids);
    }
  } catch (e) {
    affectedRunIds = [];
  }

  return {
    id: row.id,
    type: row.type as
      | 'click_missing'
      | 'click_anomaly'
      | 'duplicate_conversion'
      | 'rule_change'
      | 'data_inconsistency',
    level: row.level as 'high' | 'medium' | 'low',
    title: row.title,
    description: row.description ?? '',
    suggestion: row.suggestion ?? '',
    affectedCount: row.affected_count,
    affectedRunIds,
    status: row.status as 'pending' | 'processing' | 'resolved' | 'ignored',
    handledBy: row.handled_by,
    handledAt: row.handled_at,
    handleNote: row.handle_note,
    createdAt: row.created_at,
    traceId: row.trace_id,
  };
}

function mapActionLog(row: any): ActionLog {
  let beforeState: any = undefined;
  let afterState: any = undefined;

  try {
    if (row.before_state) {
      beforeState = JSON.parse(row.before_state);
    }
  } catch (e) {
    beforeState = undefined;
  }

  try {
    if (row.after_state) {
      afterState = JSON.parse(row.after_state);
    }
  } catch (e) {
    afterState = undefined;
  }

  return {
    id: row.id,
    traceId: row.trace_id,
    operatorId: row.operator_id,
    operatorName: row.operator_name,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    beforeState,
    afterState,
    ip: row.ip,
    userAgent: row.user_agent,
    timestamp: row.timestamp,
  };
}

function buildExceptionWhereClause(params: ExceptionQueryParams): { sql: string; values: any[] } {
  const conditions: string[] = [];
  const values: any[] = [];

  if (params.type) {
    conditions.push('type = ?');
    values.push(params.type);
  }
  if (params.level) {
    conditions.push('level = ?');
    values.push(params.level);
  }
  if (params.status) {
    conditions.push('status = ?');
    values.push(params.status);
  }
  if (params.startDate) {
    conditions.push('created_at >= ?');
    values.push(params.startDate);
  }
  if (params.endDate) {
    conditions.push('created_at <= ?');
    values.push(params.endDate);
  }

  const sql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { sql, values };
}

export function createException(
  exception: Omit<ExceptionRecord, 'createdAt' | 'id'>
): ExceptionRecord {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const stmt = db.prepare(`
    INSERT INTO exception_record (
      id, type, level, title, description, suggestion,
      affected_count, affected_run_ids, status, handled_by, handled_at,
      handle_note, created_at, trace_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    exception.type,
    exception.level,
    exception.title,
    exception.description ?? null,
    exception.suggestion ?? null,
    exception.affectedCount,
    JSON.stringify(exception.affectedRunIds),
    exception.status,
    exception.handledBy ?? null,
    exception.handledAt ?? null,
    exception.handleNote ?? null,
    now,
    exception.traceId ?? null
  );
  return { ...exception, id, createdAt: now };
}

export function findExceptions(params: ExceptionQueryParams = {}): ExceptionRecord[] {
  const { sql, values } = buildExceptionWhereClause(params);
  const stmt = db.prepare(`SELECT * FROM exception_record ${sql} ORDER BY created_at DESC`);
  const rows = stmt.all(...values);
  return rows.map(mapExceptionRecord);
}

export function updateException(
  id: string,
  data: Partial<Omit<ExceptionRecord, 'id' | 'createdAt'>>
): ExceptionRecord {
  const fields: string[] = [];
  const values: any[] = [];

  if (data.status !== undefined) {
    fields.push('status = ?');
    values.push(data.status);
  }
  if (data.handledBy !== undefined) {
    fields.push('handled_by = ?');
    values.push(data.handledBy);
  }
  if (data.handledAt !== undefined) {
    fields.push('handled_at = ?');
    values.push(data.handledAt);
  }
  if (data.handleNote !== undefined) {
    fields.push('handle_note = ?');
    values.push(data.handleNote);
  }
  if (data.affectedCount !== undefined) {
    fields.push('affected_count = ?');
    values.push(data.affectedCount);
  }
  if (data.affectedRunIds !== undefined) {
    fields.push('affected_run_ids = ?');
    values.push(JSON.stringify(data.affectedRunIds));
  }

  values.push(id);

  const stmt = db.prepare(`UPDATE exception_record SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  const stmtSelect = db.prepare('SELECT * FROM exception_record WHERE id = ?');
  const row = stmtSelect.get(id);
  if (!row) {
    throw new Error(`Exception record ${id} not found after update`);
  }
  return mapExceptionRecord(row);
}

export function createActionLog(log: Omit<ActionLog, 'id'>): ActionLog {
  const id = crypto.randomUUID();
  const stmt = db.prepare(`
    INSERT INTO action_log (
      id, trace_id, operator_id, operator_name, action, resource_type,
      resource_id, before_state, after_state, ip, user_agent, timestamp
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    log.traceId,
    log.operatorId,
    log.operatorName,
    log.action,
    log.resourceType,
    log.resourceId,
    log.beforeState !== undefined ? JSON.stringify(log.beforeState) : null,
    log.afterState !== undefined ? JSON.stringify(log.afterState) : null,
    log.ip,
    log.userAgent,
    log.timestamp
  );
  return { ...log, id };
}
