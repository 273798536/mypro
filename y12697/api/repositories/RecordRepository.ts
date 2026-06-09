import { db } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';
import type { ProcessingRecord } from '../../shared/types.js';

interface RecordRow {
  id: string;
  snapshot_id: string;
  section_data: string | null;
  coordinates: string | null;
  dimensions: string | null;
  conversions: string | null;
  risk_notes: string;
  conclusion: string;
  operator: string;
  created_at: string;
}

function rowToRecord(row: RecordRow): ProcessingRecord {
  return {
    id: row.id,
    snapshotId: row.snapshot_id,
    sectionData: row.section_data ? JSON.parse(row.section_data) : null,
    coordinates: row.coordinates ? JSON.parse(row.coordinates) : null,
    dimensions: row.dimensions ? JSON.parse(row.dimensions) : null,
    conversions: row.conversions ? JSON.parse(row.conversions) : [],
    riskNotes: row.risk_notes,
    conclusion: row.conclusion,
    operator: row.operator,
    createdAt: row.created_at,
  };
}

export const RecordRepository = {
  findBySnapshotId(snapshotId: string): ProcessingRecord[] {
    const rows = db
      .prepare('SELECT * FROM processing_records WHERE snapshot_id = ? ORDER BY created_at DESC')
      .all(snapshotId) as RecordRow[];
    return rows.map(rowToRecord);
  },

  findLatest(snapshotId: string): ProcessingRecord | null {
    const row = db
      .prepare('SELECT * FROM processing_records WHERE snapshot_id = ? ORDER BY created_at DESC LIMIT 1')
      .get(snapshotId) as RecordRow | undefined;
    return row ? rowToRecord(row) : null;
  },

  findById(id: string): ProcessingRecord | null {
    const row = db.prepare('SELECT * FROM processing_records WHERE id = ?').get(id) as RecordRow | undefined;
    return row ? rowToRecord(row) : null;
  },

  create(data: Omit<ProcessingRecord, 'id' | 'createdAt'>): ProcessingRecord {
    const now = new Date().toISOString();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO processing_records (id, snapshot_id, section_data, coordinates, dimensions, conversions, risk_notes, conclusion, operator, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.snapshotId,
      data.sectionData ? JSON.stringify(data.sectionData) : null,
      data.coordinates ? JSON.stringify(data.coordinates) : null,
      data.dimensions ? JSON.stringify(data.dimensions) : null,
      JSON.stringify(data.conversions ?? []),
      data.riskNotes ?? '',
      data.conclusion ?? '',
      data.operator,
      now,
    );
    return RecordRepository.findById(id)!;
  },
};
