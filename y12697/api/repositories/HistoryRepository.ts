import { db } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';
import type { HistoryRecord, FieldChange } from '../../shared/types.js';

interface HistoryRow {
  id: string;
  snapshot_id: string;
  version: number;
  processing_record_id: string;
  operator: string;
  change_reason: string;
  changes: string;
  created_at: string;
}

function rowToHistory(row: HistoryRow): HistoryRecord {
  return {
    id: row.id,
    snapshotId: row.snapshot_id,
    version: row.version,
    processingRecordId: row.processing_record_id,
    operator: row.operator,
    changeReason: row.change_reason,
    changes: JSON.parse(row.changes) as FieldChange[],
    createdAt: row.created_at,
  };
}

export const HistoryRepository = {
  findBySnapshotId(snapshotId: string): HistoryRecord[] {
    const rows = db
      .prepare('SELECT * FROM history_records WHERE snapshot_id = ? ORDER BY version DESC')
      .all(snapshotId) as HistoryRow[];
    return rows.map(rowToHistory);
  },

  getNextVersion(snapshotId: string): number {
    const row = db
      .prepare('SELECT MAX(version) as v FROM history_records WHERE snapshot_id = ?')
      .get(snapshotId) as { v: number | null };
    return (row.v ?? 0) + 1;
  },

  create(data: Omit<HistoryRecord, 'id' | 'createdAt' | 'version'> & { version?: number }): HistoryRecord {
    const now = new Date().toISOString();
    const id = uuidv4();
    const version = data.version ?? HistoryRepository.getNextVersion(data.snapshotId);
    db.prepare(`
      INSERT INTO history_records (id, snapshot_id, version, processing_record_id, operator, change_reason, changes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.snapshotId,
      version,
      data.processingRecordId,
      data.operator,
      data.changeReason,
      JSON.stringify(data.changes),
      now,
    );
    const row = db.prepare('SELECT * FROM history_records WHERE id = ?').get(id) as HistoryRow;
    return rowToHistory(row);
  },

  getDiff(recordId1: string, recordId2: string): FieldChange[] {
    const r1 = db.prepare('SELECT * FROM processing_records WHERE id = ?').get(recordId1);
    const r2 = db.prepare('SELECT * FROM processing_records WHERE id = ?').get(recordId2);
    if (!r1 || !r2) return [];
    const changes: FieldChange[] = [];
    const fields: Array<[string, keyof typeof r1]> = [
      ['sectionData', 'section_data'],
      ['coordinates', 'coordinates'],
      ['dimensions', 'dimensions'],
      ['conversions', 'conversions'],
      ['riskNotes', 'risk_notes'],
      ['conclusion', 'conclusion'],
    ];
    for (const [label, col] of fields) {
      const v1 = (r1 as any)[col];
      const v2 = (r2 as any)[col];
      if (JSON.stringify(v1) !== JSON.stringify(v2)) {
        changes.push({
          field: label,
          oldValue: v1 ? (typeof v1 === 'string' && v1.startsWith('{') || v1.startsWith('[') ? JSON.parse(v1) : v1) : null,
          newValue: v2 ? (typeof v2 === 'string' && v2.startsWith('{') || v2.startsWith('[') ? JSON.parse(v2) : v2) : null,
        });
      }
    }
    return changes;
  },
};
