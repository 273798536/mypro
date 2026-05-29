import { getDb } from '../index.js';
import type { BerthRow } from '../types.js';

export function insertBerth(record: Omit<BerthRow, 'id' | 'created_at'> & { id?: string }): string {
  const db = getDb();
  const id = record.id || crypto.randomUUID();
  db.prepare(`
    INSERT INTO berth_record (id, vessel_name, port, berth_start, berth_end, notice_time, free_period_end, voyage_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, record.vessel_name, record.port, record.berth_start, record.berth_end, record.notice_time, record.free_period_end, record.voyage_number);
  return id;
}

export function getAllBerths(): BerthRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM berth_record ORDER BY created_at DESC').all() as BerthRow[];
}

export function getBerthById(id: string): BerthRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM berth_record WHERE id = ?').get(id) as BerthRow | undefined;
}

export function updateBerth(id: string, updates: Partial<BerthRow>): boolean {
  const db = getDb();
  const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'created_at');
  if (fields.length === 0) return false;
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => (updates as Record<string, unknown>)[f]);
  const result = db.prepare(`UPDATE berth_record SET ${setClause} WHERE id = ?`).run(...values, id);
  return result.changes > 0;
}

export function deleteAllBerths(): void {
  const db = getDb();
  db.prepare('DELETE FROM berth_record').run();
}

export function getBerthsByVesselAndPort(vesselName: string, port: string): BerthRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM berth_record WHERE vessel_name = ? AND port = ?').all(vesselName, port) as BerthRow[];
}
