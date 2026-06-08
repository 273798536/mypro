import { db, generateId, nowISO } from '../database.js';
import type { ChangeHistory, HistoryAction, HistoryTargetType } from '../../../shared/types.js';

interface ChangeHistoryRow {
  id: string;
  inspection_id: string;
  batch_id: string;
  operator: string;
  action: HistoryAction;
  target_type: HistoryTargetType;
  target_id: string;
  reason: string;
  before_value: string | null;
  after_value: string | null;
  created_at: string;
}

function rowToChangeHistory(row: ChangeHistoryRow): ChangeHistory {
  return {
    id: row.id,
    inspectionId: row.inspection_id,
    batchId: row.batch_id,
    operator: row.operator,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    reason: row.reason,
    beforeValue: row.before_value ? JSON.parse(row.before_value) : {},
    afterValue: row.after_value ? JSON.parse(row.after_value) : {},
    createdAt: row.created_at,
  };
}

export const ChangeHistoryRepository = {
  listByInspection(inspectionId: string): ChangeHistory[] {
    const rows = db
      .prepare('SELECT * FROM change_history WHERE inspection_id = ? ORDER BY created_at DESC')
      .all(inspectionId) as ChangeHistoryRow[];
    return rows.map(rowToChangeHistory);
  },

  create(data: {
    inspectionId: string;
    batchId: string;
    operator: string;
    action: HistoryAction;
    targetType: HistoryTargetType;
    targetId: string;
    reason?: string;
    beforeValue?: Record<string, unknown>;
    afterValue?: Record<string, unknown>;
  }): ChangeHistory {
    const id = generateId('hist_');
    const now = nowISO();
    db.prepare(
      `INSERT INTO change_history (id, inspection_id, batch_id, operator, action, target_type, target_id, reason, before_value, after_value, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.inspectionId,
      data.batchId,
      data.operator,
      data.action,
      data.targetType,
      data.targetId,
      data.reason || '',
      data.beforeValue ? JSON.stringify(data.beforeValue) : null,
      data.afterValue ? JSON.stringify(data.afterValue) : null,
      now
    );
    const row = db.prepare('SELECT * FROM change_history WHERE id = ?').get(id) as ChangeHistoryRow;
    return rowToChangeHistory(row);
  },
};
