import { getDb } from '../index.js';
import type { CalculationRow, SegmentRow } from '../types.js';
import type { ExemptionDetail } from '@shared/types.js';

export function insertCalculation(result: Omit<CalculationRow, 'calculated_at'>): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO calculation_result (id, berth_id, total_demurrage, free_hours, chargeable_hours, exempted_hours, currency, flags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(result.id, result.berth_id, result.total_demurrage, result.free_hours, result.chargeable_hours, result.exempted_hours, result.currency, result.flags);
}

export function insertSegment(segment: Omit<SegmentRow, 'exemptions_json'> & { exemptions: ExemptionDetail[] }): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO calculation_segment (id, calculation_id, start_time, end_time, segment_type, rate_tier, rate, hours, amount, exempted_hours, needs_review, review_reason, exemptions_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(segment.id, segment.calculation_id, segment.start_time, segment.end_time, segment.segment_type, segment.rate_tier, segment.rate, segment.hours, segment.amount, segment.exempted_hours, segment.needs_review, segment.review_reason, JSON.stringify(segment.exemptions));
}

export function getCalculationById(id: string): CalculationRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM calculation_result WHERE id = ?').get(id) as CalculationRow | undefined;
}

export function getSegmentsByCalculationId(calculationId: string): SegmentRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM calculation_segment WHERE calculation_id = ? ORDER BY start_time').all(calculationId) as SegmentRow[];
}

export function listCalculations(filters: { vesselName?: string; port?: string; dateFrom?: string; dateTo?: string; flag?: string }): Array<{ id: string; vessel_name: string; port: string; berth_start: string; total_demurrage: number; flags: string }> {
  const db = getDb();
  let sql = `SELECT cr.id, br.vessel_name, br.port, br.berth_start, cr.total_demurrage, cr.flags
    FROM calculation_result cr
    JOIN berth_record br ON cr.berth_id = br.id
    WHERE 1=1`;
  const params: unknown[] = [];

  if (filters.vesselName) {
    sql += ' AND br.vessel_name LIKE ?';
    params.push(`%${filters.vesselName}%`);
  }
  if (filters.port) {
    sql += ' AND br.port LIKE ?';
    params.push(`%${filters.port}%`);
  }
  if (filters.dateFrom) {
    sql += ' AND br.berth_start >= ?';
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    sql += ' AND br.berth_start <= ?';
    params.push(filters.dateTo);
  }
  if (filters.flag) {
    sql += ' AND cr.flags LIKE ?';
    params.push(`%${filters.flag}%`);
  }

  sql += ' ORDER BY cr.calculated_at DESC';
  return db.prepare(sql).all(...params) as Array<{ id: string; vessel_name: string; port: string; berth_start: string; total_demurrage: number; flags: string }>;
}

export function deleteAllCalculations(): void {
  const db = getDb();
  db.prepare('DELETE FROM calculation_segment').run();
  db.prepare('DELETE FROM calculation_result').run();
}
