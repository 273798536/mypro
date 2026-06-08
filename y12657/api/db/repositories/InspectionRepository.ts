import { db, generateId, nowISO } from '../database.js';
import type { Inspection, InspectionStatus, BaseUnit } from '../../../shared/types.js';

interface InspectionRow {
  id: string;
  project_name: string;
  garage_code: string;
  scope: string;
  base_unit: BaseUnit;
  status: InspectionStatus;
  min_clearance_required: number;
  current_batch_id: string;
  last_editor: string;
  created_at: string;
  updated_at: string;
}

function rowToInspection(row: InspectionRow): Inspection {
  return {
    id: row.id,
    projectName: row.project_name,
    garageCode: row.garage_code,
    scope: row.scope,
    baseUnit: row.base_unit,
    status: row.status,
    minClearanceRequired: row.min_clearance_required,
    currentBatchId: row.current_batch_id,
    lastEditor: row.last_editor,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const InspectionRepository = {
  list(keyword?: string, status?: InspectionStatus): Inspection[] {
    let sql = 'SELECT * FROM inspections WHERE 1=1';
    const params: unknown[] = [];
    if (keyword) {
      sql += ' AND (project_name LIKE ? OR garage_code LIKE ?)';
      const like = `%${keyword}%`;
      params.push(like, like);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    sql += ' ORDER BY updated_at DESC';
    const rows = db.prepare(sql).all(...params) as InspectionRow[];
    return rows.map(rowToInspection);
  },

  getById(id: string): Inspection | null {
    const row = db.prepare('SELECT * FROM inspections WHERE id = ?').get(id) as InspectionRow | undefined;
    return row ? rowToInspection(row) : null;
  },

  create(data: {
    projectName: string;
    garageCode: string;
    scope?: string;
    baseUnit?: BaseUnit;
    minClearanceRequired?: number;
    lastEditor: string;
  }): Inspection {
    const id = generateId('insp_');
    const now = nowISO();
    const batchId = generateId('batch_');
    db.prepare(
      `INSERT INTO inspections (id, project_name, garage_code, scope, base_unit, status, min_clearance_required, current_batch_id, last_editor, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.projectName,
      data.garageCode,
      data.scope || '',
      data.baseUnit || 'mm',
      data.minClearanceRequired || 2200,
      batchId,
      data.lastEditor,
      now,
      now
    );
    return InspectionRepository.getById(id)!;
  },

  update(id: string, data: Partial<{
    projectName: string;
    garageCode: string;
    scope: string;
    baseUnit: BaseUnit;
    status: InspectionStatus;
    minClearanceRequired: number;
    currentBatchId: string;
    lastEditor: string;
  }>): void {
    const fields: string[] = [];
    const params: unknown[] = [];
    const map: Record<string, string> = {
      projectName: 'project_name',
      garageCode: 'garage_code',
      scope: 'scope',
      baseUnit: 'base_unit',
      status: 'status',
      minClearanceRequired: 'min_clearance_required',
      currentBatchId: 'current_batch_id',
      lastEditor: 'last_editor',
    };
    for (const [key, col] of Object.entries(map)) {
      if (key in data && (data as Record<string, unknown>)[key] !== undefined) {
        fields.push(`${col} = ?`);
        params.push((data as Record<string, unknown>)[key]);
      }
    }
    if (fields.length === 0) return;
    fields.push('updated_at = ?');
    params.push(nowISO(), id);
    db.prepare(`UPDATE inspections SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  },
};
