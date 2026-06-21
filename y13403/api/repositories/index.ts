import db from '../data/init';
import type { TopoRecord, RecordStatus, BoundaryResult, RecordVersion, ComputationStep } from '../../shared/types';

interface RecordRow {
  id: string;
  record_no: string;
  param_version: string;
  status: RecordStatus;
  boundary_result: BoundaryResult;
  remark: string;
  is_late_submission: number;
  no_mismatch: number;
  current_version: number;
  created_at: string;
  updated_at: string;
}

interface VersionRow {
  id: string;
  record_id: string;
  version: number;
  status: RecordStatus;
  boundary_result: BoundaryResult;
  remark: string;
  param_version: string;
  operator: string;
  changed_at: string;
}

interface StepRow {
  id: string;
  record_id: string;
  step_id: number;
  title: string;
  description: string;
  input_json: string;
  output_json: string;
  passed: number;
  contributes_to_conclusion: number;
  timestamp: string;
}

function mapRecord(r: RecordRow): TopoRecord {
  return {
    id: r.id,
    recordNo: r.record_no,
    paramVersion: r.param_version,
    status: r.status,
    boundaryResult: r.boundary_result,
    remark: r.remark,
    isLateSubmission: r.is_late_submission === 1,
    noMismatch: r.no_mismatch === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    currentVersion: r.current_version,
  };
}

function mapVersion(v: VersionRow): RecordVersion {
  return {
    id: v.id,
    recordId: v.record_id,
    version: v.version,
    status: v.status,
    boundaryResult: v.boundary_result,
    remark: v.remark,
    paramVersion: v.param_version,
    operator: v.operator,
    changedAt: v.changed_at,
  };
}

function mapStep(s: StepRow): ComputationStep {
  return {
    stepId: s.step_id,
    title: s.title,
    description: s.description,
    input: JSON.parse(s.input_json),
    output: JSON.parse(s.output_json),
    passed: s.passed === 1,
    contributesToConclusion: s.contributes_to_conclusion === 1,
    timestamp: s.timestamp,
  };
}

export const RecordRepository = {
  list(filters?: { status?: RecordStatus; keyword?: string }): TopoRecord[] {
    let sql = 'SELECT * FROM records WHERE 1=1';
    const params: string[] = [];
    if (filters?.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters?.keyword) {
      sql += ' AND (record_no LIKE ? OR remark LIKE ? OR param_version LIKE ?)';
      const kw = `%${filters.keyword}%`;
      params.push(kw, kw, kw);
    }
    sql += ' ORDER BY datetime(updated_at) DESC';
    const rows = db.prepare(sql).all(...params) as RecordRow[];
    return rows.map(mapRecord);
  },

  getById(id: string): TopoRecord | null {
    const row = db.prepare('SELECT * FROM records WHERE id = ?').get(id) as RecordRow | undefined;
    return row ? mapRecord(row) : null;
  },

  insert(record: Omit<TopoRecord, 'id'> & { id?: string }): TopoRecord {
    const id = record.id ?? `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = record.createdAt ?? new Date().toISOString();
    db.prepare(`
      INSERT INTO records (id, record_no, param_version, status, boundary_result, remark, is_late_submission, no_mismatch, current_version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      record.recordNo,
      record.paramVersion,
      record.status,
      record.boundaryResult,
      record.remark,
      record.isLateSubmission ? 1 : 0,
      record.noMismatch ? 1 : 0,
      record.currentVersion,
      now,
      now,
    );
    return this.getById(id)!;
  },

  update(id: string, patch: Partial<Pick<TopoRecord, 'status' | 'boundaryResult' | 'remark' | 'currentVersion' | 'updatedAt'>>): void {
    const fields: string[] = [];
    const params: any[] = [];
    if (patch.status !== undefined) { fields.push('status = ?'); params.push(patch.status); }
    if (patch.boundaryResult !== undefined) { fields.push('boundary_result = ?'); params.push(patch.boundaryResult); }
    if (patch.remark !== undefined) { fields.push('remark = ?'); params.push(patch.remark); }
    if (patch.currentVersion !== undefined) { fields.push('current_version = ?'); params.push(patch.currentVersion); }
    fields.push('updated_at = ?');
    params.push(patch.updatedAt ?? new Date().toISOString());
    params.push(id);
    db.prepare(`UPDATE records SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  },
};

export const VersionRepository = {
  listByRecord(recordId: string): RecordVersion[] {
    const rows = db.prepare('SELECT * FROM versions WHERE record_id = ? ORDER BY version ASC').all(recordId) as VersionRow[];
    return rows.map(mapVersion);
  },

  getLatest(recordId: string): RecordVersion | null {
    const row = db.prepare('SELECT * FROM versions WHERE record_id = ? ORDER BY version DESC LIMIT 1').get(recordId) as VersionRow | undefined;
    return row ? mapVersion(row) : null;
  },

  getByVersion(recordId: string, version: number): RecordVersion | null {
    const row = db.prepare('SELECT * FROM versions WHERE record_id = ? AND version = ?').get(recordId, version) as VersionRow | undefined;
    return row ? mapVersion(row) : null;
  },

  insert(v: Omit<RecordVersion, 'id'> & { id?: string }): RecordVersion {
    const id = v.id ?? `ver-${v.recordId}-${v.version}-${Math.random().toString(36).slice(2, 6)}`;
    db.prepare(`
      INSERT INTO versions (id, record_id, version, status, boundary_result, remark, param_version, operator, changed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, v.recordId, v.version, v.status, v.boundaryResult, v.remark, v.paramVersion, v.operator, v.changedAt);
    return this.getByVersion(v.recordId, v.version)!;
  },
};

export const StepRepository = {
  listByRecord(recordId: string): ComputationStep[] {
    const rows = db.prepare('SELECT * FROM computation_steps WHERE record_id = ? ORDER BY step_id ASC').all(recordId) as StepRow[];
    return rows.map(mapStep);
  },

  clearByRecord(recordId: string): void {
    db.prepare('DELETE FROM computation_steps WHERE record_id = ?').run(recordId);
  },

  insertMany(recordId: string, steps: ComputationStep[]): void {
    const stmt = db.prepare(`
      INSERT INTO computation_steps (id, record_id, step_id, title, description, input_json, output_json, passed, contributes_to_conclusion, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const tx = db.transaction(() => {
      for (const s of steps) {
        stmt.run(
          `${recordId}-step-${s.stepId}-${Date.now()}`,
          recordId,
          s.stepId,
          s.title,
          s.description,
          JSON.stringify(s.input),
          JSON.stringify(s.output),
          s.passed ? 1 : 0,
          s.contributesToConclusion ? 1 : 0,
          s.timestamp,
        );
      }
    });
    tx();
  },
};

export const IdempotencyRepository = {
  get(key: string): { responseJson: string; createdAt: string } | null {
    const row = db.prepare('SELECT response_json, created_at FROM idempotency_keys WHERE key = ?').get(key) as { response_json: string; created_at: string } | undefined;
    if (!row) return null;
    return { responseJson: row.response_json, createdAt: row.created_at };
  },

  set(key: string, requestHash: string, responseJson: string): void {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR REPLACE INTO idempotency_keys (key, request_hash, response_json, created_at)
      VALUES (?, ?, ?, ?)
    `).run(key, requestHash, responseJson, now);
  },

  purgeOld(): void {
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    db.prepare('DELETE FROM idempotency_keys WHERE created_at < ?').run(cutoff);
  },
};
