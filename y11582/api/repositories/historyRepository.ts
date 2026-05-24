
import { getDatabase } from '../db/database';
import type { OperationHistory } from '../../shared/types';
import { randomUUID } from 'crypto';

function rowToHistory(row: any): OperationHistory {
  return {
    id: row.id,
    taskId: row.task_id,
    operation: row.operation,
    operator: row.operator,
    beforeState: row.before_state ? JSON.parse(row.before_state) : null,
    afterState: row.after_state ? JSON.parse(row.after_state) : null,
    diff: row.diff ? JSON.parse(row.diff) : null,
    remark: row.remark,
    createdAt: row.created_at,
  };
}

export const historyRepository = {
  create(data: {
    taskId: string;
    operation: string;
    operator: string;
    beforeState?: Record<string, any> | null;
    afterState?: Record<string, any> | null;
    diff?: Record<string, any> | null;
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
      data.remark || null,
      now
    );
    
    return this.findById(id)!;
  },

  findById(id: string): OperationHistory | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM operation_history WHERE id = ?').get(id);
    return row ? rowToHistory(row) : null;
  },

  findByTaskId(taskId: string): OperationHistory[] {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT * FROM operation_history 
      WHERE task_id = ? 
      ORDER BY created_at ASC
    `).all(taskId);
    return rows.map(rowToHistory);
  },

  calculateDiff(before: Record<string, any> | null, after: Record<string, any> | null): Record<string, any> {
    const diff: Record<string, any> = {};
    const allKeys = new Set([
      ...Object.keys(before || {}),
      ...Object.keys(after || {}),
    ]);
    
    for (const key of allKeys) {
      const beforeVal = before?.[key];
      const afterVal = after?.[key];
      
      if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
        diff[key] = { before: beforeVal, after: afterVal };
      }
    }
    
    return diff;
  },
};
