import { db } from '../db/index.js';
import type {
  ReviewTask,
  CrackParams,
  ChangeHistory,
  MaterialSource,
  TaskStatus,
} from '../../shared/types.js';

function rowToTask(row: any): ReviewTask {
  return {
    id: row.id,
    taskNo: row.task_no,
    bridgeName: row.bridge_name,
    bridgeCode: row.bridge_code,
    crackCount: row.crack_count,
    submitter: row.submitter,
    submittedAt: row.submitted_at,
    status: row.status as TaskStatus,
    hasBadData: !!row.has_bad_data,
  };
}

function rowToCrack(row: any): CrackParams {
  return {
    id: row.id,
    taskId: row.task_id,
    crackId: row.crack_id,
    collectionTime: row.collection_time,
    processTime: row.process_time,
    reviewTime: row.review_time,
    lengthValue: row.length_value,
    lengthUnit: row.length_unit,
    widthValue: row.width_value,
    widthUnit: row.width_unit,
    depthValue: row.depth_value,
    depthUnit: row.depth_unit,
    collisionDetected: !!row.collision_detected,
    overlapMaterialId: row.overlap_material_id ?? undefined,
    conclusion: row.conclusion,
  };
}

function rowToHistory(row: any): ChangeHistory {
  return {
    id: row.id,
    taskId: row.task_id,
    fieldName: row.field_name,
    oldValue: row.old_value,
    newValue: row.new_value,
    operator: row.operator,
    operatedAt: row.operated_at,
    reason: row.reason,
    collisionChanged: !!row.collision_changed,
  };
}

function rowToMaterial(row: any): MaterialSource {
  return {
    id: row.id,
    taskId: row.task_id,
    type: row.type,
    name: row.name,
    sourceFile: row.source_file,
    submittedBy: row.submitted_by,
    calibrationStatus: row.calibration_status,
  };
}

export const TaskRepository = {
  list(filters?: { status?: TaskStatus; keyword?: string }): ReviewTask[] {
    let sql = 'SELECT * FROM review_task WHERE 1=1';
    const params: any[] = [];
    if (filters?.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters?.keyword) {
      sql += ' AND (task_no LIKE ? OR bridge_name LIKE ? OR bridge_code LIKE ?)';
      const kw = `%${filters.keyword}%`;
      params.push(kw, kw, kw);
    }
    sql += ' ORDER BY submitted_at DESC';
    return db.prepare(sql).all(...params).map(rowToTask);
  },

  get(id: string): ReviewTask | undefined {
    const row = db.prepare('SELECT * FROM review_task WHERE id = ?').get(id);
    return row ? rowToTask(row) : undefined;
  },

  updateStatus(id: string, status: TaskStatus) {
    db.prepare('UPDATE review_task SET status = ? WHERE id = ?').run(status, id);
  },

  getParams(taskId: string): CrackParams[] {
    return db
      .prepare('SELECT * FROM crack_params WHERE task_id = ? ORDER BY crack_id')
      .all(taskId)
      .map(rowToCrack);
  },

  getParamsByCrack(taskId: string, crackId: string): CrackParams | undefined {
    const row = db
      .prepare('SELECT * FROM crack_params WHERE task_id = ? AND crack_id = ?')
      .get(taskId, crackId);
    return row ? rowToCrack(row) : undefined;
  },

  updateCrackField(
    taskId: string,
    crackId: string,
    field: string,
    value: string | number | boolean | null,
  ) {
    const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
    db.prepare(`UPDATE crack_params SET ${dbField} = ? WHERE task_id = ? AND crack_id = ?`).run(
      value,
      taskId,
      crackId,
    );
  },

  updateCollision(taskId: string, crackId: string, detected: boolean, materialId?: string) {
    db.prepare(
      'UPDATE crack_params SET collision_detected = ?, overlap_material_id = ? WHERE task_id = ? AND crack_id = ?',
    ).run(detected ? 1 : 0, materialId ?? null, taskId, crackId);
  },

  getHistory(taskId: string): ChangeHistory[] {
    return db
      .prepare('SELECT * FROM change_history WHERE task_id = ? ORDER BY operated_at DESC')
      .all(taskId)
      .map(rowToHistory);
  },

  addHistory(h: Omit<ChangeHistory, 'id'>) {
    const id = `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    db.prepare(
      `INSERT INTO change_history (id, task_id, field_name, old_value, new_value, operator, operated_at, reason, collision_changed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      h.taskId,
      h.fieldName,
      h.oldValue,
      h.newValue,
      h.operator,
      h.operatedAt,
      h.reason,
      h.collisionChanged ? 1 : 0,
    );
    return id;
  },

  getMaterials(taskId: string): MaterialSource[] {
    return db
      .prepare('SELECT * FROM material_source WHERE task_id = ? ORDER BY type, name')
      .all(taskId)
      .map(rowToMaterial);
  },

  getMaterial(materialId: string): MaterialSource | undefined {
    const row = db.prepare('SELECT * FROM material_source WHERE id = ?').get(materialId);
    return row ? rowToMaterial(row) : undefined;
  },
};
