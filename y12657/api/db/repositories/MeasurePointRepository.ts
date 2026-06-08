import { db, generateId, nowISO } from '../database.js';
import type { MeasurePoint, MeasurePointStatus } from '../../../shared/types.js';

interface MeasurePointRow {
  id: string;
  inspection_id: string;
  batch_id: string;
  section_line_id: string | null;
  code: string;
  coord_x: number;
  coord_y: number;
  coord_z: number;
  measured_value: number;
  calculated_clearance: number | null;
  is_abnormal: number;
  screenshot_url: string | null;
  status: MeasurePointStatus;
  remark: string | null;
  handling_opinion: string | null;
  created_at: string;
  updated_at: string;
}

function rowToMeasurePoint(row: MeasurePointRow): MeasurePoint {
  return {
    id: row.id,
    inspectionId: row.inspection_id,
    batchId: row.batch_id,
    sectionLineId: row.section_line_id || '',
    code: row.code,
    coordinate: { x: row.coord_x, y: row.coord_y, z: row.coord_z },
    measuredValue: row.measured_value,
    calculatedClearance: row.calculated_clearance ?? 0,
    isAbnormal: row.is_abnormal === 1,
    screenshotUrl: row.screenshot_url || '',
    status: row.status,
    remark: row.remark || '',
    handlingOpinion: row.handling_opinion || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const MeasurePointRepository = {
  listByBatch(inspectionId: string, batchId: string): MeasurePoint[] {
    const rows = db
      .prepare('SELECT * FROM measure_points WHERE inspection_id = ? AND batch_id = ? ORDER BY code ASC')
      .all(inspectionId, batchId) as MeasurePointRow[];
    return rows.map(rowToMeasurePoint);
  },

  getById(id: string): MeasurePoint | null {
    const row = db.prepare('SELECT * FROM measure_points WHERE id = ?').get(id) as MeasurePointRow | undefined;
    return row ? rowToMeasurePoint(row) : null;
  },

  createBatch(points: Array<{
    id?: string;
    inspectionId: string;
    batchId: string;
    sectionLineId?: string;
    code: string;
    coordinate: { x: number; y: number; z: number };
    measuredValue: number;
    calculatedClearance?: number;
    isAbnormal?: boolean;
    screenshotUrl?: string;
    status?: MeasurePointStatus;
    remark?: string;
    handlingOpinion?: string;
  }>): MeasurePoint[] {
    const now = nowISO();
    const insertStmt = db.prepare(
      `INSERT INTO measure_points (id, inspection_id, batch_id, section_line_id, code, coord_x, coord_y, coord_z, measured_value, calculated_clearance, is_abnormal, screenshot_url, status, remark, handling_opinion, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertMany = db.transaction((pts: typeof points) => {
      for (const p of pts) {
        const id = p.id || generateId('pt_');
        insertStmt.run(
          id,
          p.inspectionId,
          p.batchId,
          p.sectionLineId || null,
          p.code,
          p.coordinate.x,
          p.coordinate.y,
          p.coordinate.z,
          p.measuredValue,
          p.calculatedClearance ?? null,
          p.isAbnormal ? 1 : 0,
          p.screenshotUrl || null,
          p.status || 'normal',
          p.remark || null,
          p.handlingOpinion || null,
          now,
          now
        );
      }
    });
    insertMany(points);
    return MeasurePointRepository.listByBatch(points[0].inspectionId, points[0].batchId);
  },

  update(id: string, data: Partial<{
    sectionLineId: string;
    code: string;
    coordinate: { x: number; y: number; z: number };
    measuredValue: number;
    calculatedClearance: number;
    isAbnormal: boolean;
    screenshotUrl: string;
    status: MeasurePointStatus;
    remark: string;
    handlingOpinion: string;
  }>): void {
    const fields: string[] = [];
    const params: unknown[] = [];
    const map: Record<string, string> = {
      sectionLineId: 'section_line_id',
      code: 'code',
      measuredValue: 'measured_value',
      calculatedClearance: 'calculated_clearance',
      screenshotUrl: 'screenshot_url',
      status: 'status',
      remark: 'remark',
      handlingOpinion: 'handling_opinion',
    };
    for (const [key, col] of Object.entries(map)) {
      if (key in data && (data as Record<string, unknown>)[key] !== undefined) {
        fields.push(`${col} = ?`);
        params.push((data as Record<string, unknown>)[key]);
      }
    }
    if ('coordinate' in data && data.coordinate !== undefined) {
      fields.push('coord_x = ?', 'coord_y = ?', 'coord_z = ?');
      params.push(data.coordinate.x, data.coordinate.y, data.coordinate.z);
    }
    if ('isAbnormal' in data && data.isAbnormal !== undefined) {
      fields.push('is_abnormal = ?');
      params.push(data.isAbnormal ? 1 : 0);
    }
    if (fields.length === 0) return;
    fields.push('updated_at = ?');
    params.push(nowISO(), id);
    db.prepare(`UPDATE measure_points SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  },

  delete(id: string): void {
    db.prepare('DELETE FROM measure_points WHERE id = ?').run(id);
  },
};
