import { db } from '../db/index';
import type { SamplingRecord, SamplingRecordInput, RiskAssessmentHistory, AssessmentLog } from '../../shared/types';

interface SamplingRecordRow {
  id: number;
  date: string;
  area: string;
  species: string;
  wind_wave_forecast: string | null;
  tide_data: string | null;
  water_quality: string | null;
  risk_level: string;
  risk_factors: string;
  confirmed: number;
  created_at: string;
  updated_at: string;
}

interface RiskAssessmentRow {
  id: number;
  record_id: number;
  risk_level: string;
  risk_factors: string;
  affected_conclusions: string;
  assessed_at: string;
}

interface AssessmentLogRow {
  id: number;
  record_id: number;
  action: string;
  detail: string;
  created_at: string;
}

const parseRecordRow = (row: SamplingRecordRow): SamplingRecord => ({
  ...row,
  risk_factors: JSON.parse(row.risk_factors),
  confirmed: row.confirmed === 1,
  risk_level: row.risk_level as 'normal' | 'pending' | 'anomaly'
});

const parseAssessmentRow = (row: RiskAssessmentRow): RiskAssessmentHistory => ({
  ...row,
  risk_factors: JSON.parse(row.risk_factors),
  affected_conclusions: JSON.parse(row.affected_conclusions),
  risk_level: row.risk_level as 'normal' | 'pending' | 'anomaly'
});

const parseLogRow = (row: AssessmentLogRow): AssessmentLog => ({
  ...row,
  detail: JSON.parse(row.detail)
});

export const SamplingRecordRepository = {
  findAll: (riskLevel?: string): SamplingRecord[] => {
    let sql = 'SELECT * FROM sampling_records ORDER BY date DESC';
    let params: unknown[] = [];
    if (riskLevel) {
      sql = 'SELECT * FROM sampling_records WHERE risk_level = ? ORDER BY date DESC';
      params = [riskLevel];
    }
    const rows = db.prepare(sql).all(...params) as SamplingRecordRow[];
    return rows.map(parseRecordRow);
  },

  findById: (id: number): SamplingRecord | null => {
    const row = db.prepare('SELECT * FROM sampling_records WHERE id = ?').get(id) as SamplingRecordRow | undefined;
    return row ? parseRecordRow(row) : null;
  },

  create: (input: SamplingRecordInput): number => {
    const stmt = db.prepare(`
      INSERT INTO sampling_records (date, area, species, wind_wave_forecast, tide_data, water_quality)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      input.date,
      input.area,
      input.species,
      input.wind_wave_forecast ?? null,
      input.tide_data ?? null,
      input.water_quality ?? null
    );
    return Number(result.lastInsertRowid);
  },

  update: (id: number, updates: Partial<SamplingRecordInput> & { risk_level?: string; risk_factors?: string[]; confirmed?: boolean }): void => {
    const fields: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'risk_factors') {
        fields.push(`${key} = ?`);
        values.push(JSON.stringify(value));
      } else if (key === 'confirmed') {
        fields.push(`${key} = ?`);
        values.push(value ? 1 : 0);
      } else {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    fields.push('updated_at = datetime(\'now\', \'localtime\')');

    const sql = `UPDATE sampling_records SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);
    db.prepare(sql).run(...values);
  },

  delete: (id: number): void => {
    db.prepare('DELETE FROM sampling_records WHERE id = ?').run(id);
  },

  countByRisk: (): { normal: number; pending: number; anomaly: number } => {
    const rows = db.prepare(`
      SELECT risk_level, COUNT(*) as cnt
      FROM sampling_records
      GROUP BY risk_level
    `).all() as { risk_level: string; cnt: number }[];

    const result = { normal: 0, pending: 0, anomaly: 0 };
    for (const row of rows) {
      if (row.risk_level in result) {
        (result as Record<string, number>)[row.risk_level] = row.cnt;
      }
    }
    return result;
  }
};

export const RiskAssessmentRepository = {
  create: (
    recordId: number,
    riskLevel: string,
    riskFactors: string[],
    affectedConclusions: unknown[]
  ): number => {
    const stmt = db.prepare(`
      INSERT INTO risk_assessments (record_id, risk_level, risk_factors, affected_conclusions)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(
      recordId,
      riskLevel,
      JSON.stringify(riskFactors),
      JSON.stringify(affectedConclusions)
    );
    return Number(result.lastInsertRowid);
  },

  findByRecordId: (recordId: number): RiskAssessmentHistory[] => {
    const rows = db.prepare(`
      SELECT * FROM risk_assessments
      WHERE record_id = ?
      ORDER BY assessed_at DESC
    `).all(recordId) as RiskAssessmentRow[];
    return rows.map(parseAssessmentRow);
  }
};

export const AssessmentLogRepository = {
  create: (recordId: number, action: string, detail: Record<string, unknown>): number => {
    const stmt = db.prepare(`
      INSERT INTO assessment_log (record_id, action, detail)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(recordId, action, JSON.stringify(detail));
    return Number(result.lastInsertRowid);
  },

  findByRecordId: (recordId: number): AssessmentLog[] => {
    const rows = db.prepare(`
      SELECT * FROM assessment_log
      WHERE record_id = ?
      ORDER BY created_at DESC
    `).all(recordId) as AssessmentLogRow[];
    return rows.map(parseLogRow);
  }
};
