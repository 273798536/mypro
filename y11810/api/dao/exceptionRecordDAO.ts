import db from '../db/index.js';
import type { ExceptionRecord } from '../../shared/types/index.js';

export const exceptionRecordDAO = {
  findById(id: string): ExceptionRecord | undefined {
    const row = db.prepare('SELECT * FROM exception_record WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      type: row.type as ExceptionRecord['type'],
      level: row.level as ExceptionRecord['level'],
      title: row.title,
      description: row.description ?? undefined,
      suggestion: row.suggestion ?? undefined,
      affectedCount: row.affected_count,
      affectedRunIds: row.affected_run_ids ? JSON.parse(row.affected_run_ids) : [],
      status: row.status as ExceptionRecord['status'],
      handledBy: row.handled_by ?? undefined,
      handledAt: row.handled_at ?? undefined,
      handleNote: row.handle_note ?? undefined,
      createdAt: row.created_at,
      traceId: row.trace_id ?? undefined,
    };
  },

  create(data: Omit<ExceptionRecord, 'id' | 'createdAt'>): string {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO exception_record (
        id, type, level, title, description, suggestion,
        affected_count, affected_run_ids, status, handled_by,
        handled_at, handle_note, created_at, trace_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.type,
      data.level,
      data.title,
      data.description ?? null,
      data.suggestion ?? null,
      data.affectedCount,
      data.affectedRunIds.length > 0 ? JSON.stringify(data.affectedRunIds) : null,
      data.status,
      data.handledBy ?? null,
      data.handledAt ?? null,
      data.handleNote ?? null,
      now,
      data.traceId ?? null,
    );
    return id;
  },

  updateStatus(id: string, status: ExceptionRecord['status'], handledBy?: string, handleNote?: string): void {
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE exception_record 
      SET status = ?, handled_by = ?, handled_at = ?, handle_note = ?
      WHERE id = ?
    `).run(
      status,
      handledBy ?? null,
      (status === 'resolved' || status === 'ignored') ? now : null,
      handleNote ?? null,
      id,
    );
  },

  findByType(type: ExceptionRecord['type']): ExceptionRecord[] {
    const rows = db.prepare(`
      SELECT * FROM exception_record 
      WHERE type = ? 
      ORDER BY created_at DESC
    `).all(type) as any[];
    return rows.map(row => ({
      id: row.id,
      type: row.type as ExceptionRecord['type'],
      level: row.level as ExceptionRecord['level'],
      title: row.title,
      description: row.description ?? undefined,
      suggestion: row.suggestion ?? undefined,
      affectedCount: row.affected_count,
      affectedRunIds: row.affected_run_ids ? JSON.parse(row.affected_run_ids) : [],
      status: row.status as ExceptionRecord['status'],
      handledBy: row.handled_by ?? undefined,
      handledAt: row.handled_at ?? undefined,
      handleNote: row.handle_note ?? undefined,
      createdAt: row.created_at,
      traceId: row.trace_id ?? undefined,
    }));
  },

  findByStatus(status: ExceptionRecord['status']): ExceptionRecord[] {
    const rows = db.prepare(`
      SELECT * FROM exception_record 
      WHERE status = ? 
      ORDER BY created_at DESC
    `).all(status) as any[];
    return rows.map(row => ({
      id: row.id,
      type: row.type as ExceptionRecord['type'],
      level: row.level as ExceptionRecord['level'],
      title: row.title,
      description: row.description ?? undefined,
      suggestion: row.suggestion ?? undefined,
      affectedCount: row.affected_count,
      affectedRunIds: row.affected_run_ids ? JSON.parse(row.affected_run_ids) : [],
      status: row.status as ExceptionRecord['status'],
      handledBy: row.handled_by ?? undefined,
      handledAt: row.handled_at ?? undefined,
      handleNote: row.handle_note ?? undefined,
      createdAt: row.created_at,
      traceId: row.trace_id ?? undefined,
    }));
  },

  findAll(): ExceptionRecord[] {
    const rows = db.prepare('SELECT * FROM exception_record ORDER BY created_at DESC').all() as any[];
    return rows.map(row => ({
      id: row.id,
      type: row.type as ExceptionRecord['type'],
      level: row.level as ExceptionRecord['level'],
      title: row.title,
      description: row.description ?? undefined,
      suggestion: row.suggestion ?? undefined,
      affectedCount: row.affected_count,
      affectedRunIds: row.affected_run_ids ? JSON.parse(row.affected_run_ids) : [],
      status: row.status as ExceptionRecord['status'],
      handledBy: row.handled_by ?? undefined,
      handledAt: row.handled_at ?? undefined,
      handleNote: row.handle_note ?? undefined,
      createdAt: row.created_at,
      traceId: row.trace_id ?? undefined,
    }));
  },
};
