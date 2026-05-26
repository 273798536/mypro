
import { getDatabase } from '../db/database.js';
import type { OperationHistory } from '../../shared/types.js';
import { randomUUID } from 'crypto';

interface HistoryRow {
  id: string;
  task_id: string;
  operation: string;
  operator: string;
  before_state: string | null;
  after_state: string | null;
  diff: string | null;
  remark: string | null;
  created_at: string;
}

function rowToHistory(row: HistoryRow): OperationHistory {
  return {
    id: row.id,
    taskId: row.task_id,
    operation: row.operation,
    operator: row.operator,
    beforeState: row.before_state ? JSON.parse(row.before_state) : null,
    afterState: row.after_state ? JSON.parse(row.after_state) : null,
    diff: row.diff ? JSON.parse(row.diff) : null,
    remark: row.remark ?? undefined,
    createdAt: row.created_at,
  };
}

export const historyRepository = {
  create(data: {
    taskId: string;
    operation: string;
    operator: string;
    beforeState: Record<string, unknown> | null;
    afterState: Record<string, unknown> | null;
    diff: Record<string, unknown> | null;
    remark?: string;
  }): OperationHistory {
    const db = getDatabase();
    const id = randomUUID();
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO operation_history (id, task_id, operation, operator, before_state, after_state, diff, remark, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      data.taskId,
      data.operation,
      data.operator,
      data.beforeState ? JSON.stringify(data.beforeState) : null,
      data.afterState ? JSON.stringify(data.afterState) : null,
      data.diff ? JSON.stringify(data.diff) : null,
      data.remark ?? null,
      now
    );
    
    return this.findById(id)!;
  },

  findById(id: string): OperationHistory | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM operation_history WHERE id = ?').get(id) as HistoryRow | undefined;
    return row ? rowToHistory(row) : null;
  },

  findByTaskId(taskId: string): OperationHistory[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM operation_history WHERE task_id = ? ORDER BY created_at ASC').all(taskId) as HistoryRow[];
    return rows.map(rowToHistory);
  },

  calculateDiff(
    before: Record<string, unknown> | null,
    after: Record<string, unknown> | null
  ): Record<string, unknown> | null {
    if (!before && !after) return null;
    if (!before) {
      return { after };
    }
    if (!after) {
      return { before };
    }

    const diff: Record<string, unknown> = {};
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of allKeys) {
      const beforeVal = before[key];
      const afterVal = after[key];
      if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
        diff[key] = {
          before: beforeVal,
          after: afterVal,
        };
      }
    }

    return Object.keys(diff).length > 0 ? diff : null;
  },
};
