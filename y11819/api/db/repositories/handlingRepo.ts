import { getDb } from '../index.js';
import type { HandlingRow } from '../types.js';

export function insertHandling(record: Omit<HandlingRow, 'id' | 'created_at'> & { id?: string }): string {
  const db = getDb();
  const id = record.id || crypto.randomUUID();
  db.prepare(`
    INSERT INTO handling_record (id, berth_id, handling_start, handling_end, operation_type, quantity, pause_hours, pause_reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, record.berth_id, record.handling_start, record.handling_end, record.operation_type, record.quantity, record.pause_hours || 0, record.pause_reason);
  return id;
}

export function getAllHandlings(): HandlingRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM handling_record ORDER BY created_at DESC').all() as HandlingRow[];
}

export function getHandlingsByBerthId(berthId: string): HandlingRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM handling_record WHERE berth_id = ?').all(berthId) as HandlingRow[];
}

export function updateHandling(id: string, updates: Partial<HandlingRow>): boolean {
  const db = getDb();
  const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'created_at');
  if (fields.length === 0) return false;
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => (updates as Record<string, unknown>)[f]);
  const result = db.prepare(`UPDATE handling_record SET ${setClause} WHERE id = ?`).run(...values, id);
  return result.changes > 0;
}

export function deleteAllHandlings(): void {
  const db = getDb();
  db.prepare('DELETE FROM handling_record').run();
}
