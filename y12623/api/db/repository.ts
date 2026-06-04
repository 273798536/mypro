import { db } from './init';
import type { LoadingRecord, ScoreHistory, ProcessingNote, RecordStatus, AnomalyType } from '../../shared/types';
import { randomUUID } from 'crypto';

function rowToRecord(row: any): LoadingRecord {
  return {
    id: row.id,
    batchNo: row.batch_no,
    platformNo: row.platform_no,
    vehicleNo: row.vehicle_no,
    sketchImage: row.sketch_image,
    status: row.status as RecordStatus,
    anomalyType: row.anomaly_type as AnomalyType | undefined,
    source: row.source,
    importTime: row.import_time,
    latestScore: row.latest_score,
    latestScoreNote: row.latest_score_note,
    scorer: row.scorer,
    scoreTime: row.score_time,
    isSupplement: row.is_supplement === 1,
    supplementFrom: row.supplement_from,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToHistory(row: any): ScoreHistory {
  return {
    id: row.id,
    recordId: row.record_id,
    score: row.score,
    scoreNote: row.score_note,
    reason: row.reason,
    scorer: row.scorer,
    scoreTime: row.score_time,
    previousScore: row.previous_score,
  };
}

function rowToNote(row: any): ProcessingNote {
  return {
    id: row.id,
    recordId: row.record_id,
    content: row.content,
    author: row.author,
    createTime: row.create_time,
  };
}

export const recordRepository = {
  findByUniqueKey(batchNo: string, platformNo: string, vehicleNo: string): LoadingRecord | null {
    const row = db.prepare(`
      SELECT * FROM loading_records
      WHERE batch_no = ? AND platform_no = ? AND vehicle_no = ?
    `).get(batchNo, platformNo, vehicleNo);
    return row ? rowToRecord(row) : null;
  },

  findById(id: string): LoadingRecord | null {
    const row = db.prepare('SELECT * FROM loading_records WHERE id = ?').get(id);
    return row ? rowToRecord(row) : null;
  },

  findAll(filters?: { status?: RecordStatus; anomalyType?: AnomalyType; batchNo?: string; search?: string }): LoadingRecord[] {
    let sql = 'SELECT * FROM loading_records WHERE 1=1';
    const params: any[] = [];

    if (filters?.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters?.anomalyType) {
      sql += ' AND anomaly_type = ?';
      params.push(filters.anomalyType);
    }
    if (filters?.batchNo) {
      sql += ' AND batch_no = ?';
      params.push(filters.batchNo);
    }
    if (filters?.search) {
      sql += ' AND (batch_no LIKE ? OR platform_no LIKE ? OR vehicle_no LIKE ?)';
      const search = `%${filters.search}%`;
      params.push(search, search, search);
    }

    sql += ' ORDER BY import_time DESC';
    const rows = db.prepare(sql).all(...params);
    return rows.map(rowToRecord);
  },

  findAnomalies(): LoadingRecord[] {
    const rows = db.prepare(`
      SELECT * FROM loading_records
      WHERE status = 'anomaly' OR anomaly_type IS NOT NULL
      ORDER BY import_time DESC
    `).all();
    return rows.map(rowToRecord);
  },

  create(record: Omit<LoadingRecord, 'id' | 'createdAt' | 'updatedAt'>): LoadingRecord {
    const now = Date.now();
    const id = randomUUID();
    db.prepare(`
      INSERT INTO loading_records (
        id, batch_no, platform_no, vehicle_no, sketch_image, status, anomaly_type,
        source, import_time, latest_score, latest_score_note, scorer, score_time,
        is_supplement, supplement_from, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, record.batchNo, record.platformNo, record.vehicleNo, record.sketchImage,
      record.status, record.anomalyType, record.source, record.importTime,
      record.latestScore, record.latestScoreNote, record.scorer, record.scoreTime,
      record.isSupplement ? 1 : 0, record.supplementFrom, now, now
    );
    return this.findById(id)!;
  },

  update(id: string, updates: Partial<Omit<LoadingRecord, 'id' | 'createdAt'>>): LoadingRecord | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const now = Date.now();
    const setClauses: string[] = ['updated_at = ?'];
    const params: any[] = [now];

    if (updates.batchNo !== undefined) { setClauses.push('batch_no = ?'); params.push(updates.batchNo); }
    if (updates.platformNo !== undefined) { setClauses.push('platform_no = ?'); params.push(updates.platformNo); }
    if (updates.vehicleNo !== undefined) { setClauses.push('vehicle_no = ?'); params.push(updates.vehicleNo); }
    if (updates.sketchImage !== undefined) { setClauses.push('sketch_image = ?'); params.push(updates.sketchImage); }
    if (updates.status !== undefined) { setClauses.push('status = ?'); params.push(updates.status); }
    if (updates.anomalyType !== undefined) { setClauses.push('anomaly_type = ?'); params.push(updates.anomalyType); }
    if (updates.source !== undefined) { setClauses.push('source = ?'); params.push(updates.source); }
    if (updates.importTime !== undefined) { setClauses.push('import_time = ?'); params.push(updates.importTime); }
    if (updates.latestScore !== undefined) { setClauses.push('latest_score = ?'); params.push(updates.latestScore); }
    if (updates.latestScoreNote !== undefined) { setClauses.push('latest_score_note = ?'); params.push(updates.latestScoreNote); }
    if (updates.scorer !== undefined) { setClauses.push('scorer = ?'); params.push(updates.scorer); }
    if (updates.scoreTime !== undefined) { setClauses.push('score_time = ?'); params.push(updates.scoreTime); }
    if (updates.isSupplement !== undefined) { setClauses.push('is_supplement = ?'); params.push(updates.isSupplement ? 1 : 0); }
    if (updates.supplementFrom !== undefined) { setClauses.push('supplement_from = ?'); params.push(updates.supplementFrom); }

    params.push(id);
    db.prepare(`UPDATE loading_records SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);
    return this.findById(id);
  },

  getHistory(recordId: string): ScoreHistory[] {
    const rows = db.prepare(`
      SELECT * FROM score_history WHERE record_id = ? ORDER BY score_time DESC
    `).all(recordId);
    return rows.map(rowToHistory);
  },

  addHistory(history: Omit<ScoreHistory, 'id'>): ScoreHistory {
    const id = randomUUID();
    db.prepare(`
      INSERT INTO score_history (id, record_id, score, score_note, reason, scorer, score_time, previous_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, history.recordId, history.score, history.scoreNote, history.reason, history.scorer, history.scoreTime, history.previousScore);
    return { id, ...history };
  },

  getNotes(recordId: string): ProcessingNote[] {
    const rows = db.prepare(`
      SELECT * FROM processing_notes WHERE record_id = ? ORDER BY create_time DESC
    `).all(recordId);
    return rows.map(rowToNote);
  },

  addNote(note: Omit<ProcessingNote, 'id'>): ProcessingNote {
    const id = randomUUID();
    db.prepare(`
      INSERT INTO processing_notes (id, record_id, content, author, create_time)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, note.recordId, note.content, note.author, note.createTime);
    return { id, ...note };
  },

  countByStatus(): Record<RecordStatus, number> {
    const rows = db.prepare(`
      SELECT status, COUNT(*) as count FROM loading_records GROUP BY status
    `).all() as { status: string; count: number }[];
    const result: Record<string, number> = { pending: 0, approved: 0, rejected: 0, anomaly: 0 };
    rows.forEach(r => { result[r.status] = r.count; });
    return result as Record<RecordStatus, number>;
  },
};
