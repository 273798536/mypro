import { getDb } from '../db/connection';
import { v4 as uuidv4 } from 'uuid';
import type { Task, TaskStatus } from '../../shared/types';
import auditLogRepository from './AuditLogRepository';

export class TaskRepository {
  private db = getDb();

  create(params: {
    batchId?: string;
    documentId?: string;
    type: string;
    payload: Record<string, any>;
    maxRetries?: number;
  }): Task {
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO tasks (id, batch_id, document_id, type, status, retry_count, max_retries, payload, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'PENDING', 0, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      params.batchId || null,
      params.documentId || null,
      params.type,
      params.maxRetries || 3,
      JSON.stringify(params.payload),
      now,
      now
    );

    const task = this.findById(id)!;

    auditLogRepository.create({
      entityType: 'TASK',
      entityId: id,
      action: 'CREATE',
      afterData: task,
      operatedBy: 'system',
      reason: '创建异步任务'
    });

    return task;
  }

  findById(id: string): Task | null {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  findAll(params: {
    page?: number;
    pageSize?: number;
    status?: TaskStatus;
    type?: string;
  } = {}): { data: Task[]; total: number } {
    const { page = 1, pageSize = 20, status, type } = params;
    const offset = (page - 1) * pageSize;

    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];

    if (status) {
      whereClause += ' AND status = ?';
      queryParams.push(status);
    }
    if (type) {
      whereClause += ' AND type = ?';
      queryParams.push(type);
    }

    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM tasks ${whereClause}`);
    const { count } = countStmt.get(...queryParams) as { count: number };

    const dataStmt = this.db.prepare(`
      SELECT * FROM tasks ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = dataStmt.all(...queryParams, pageSize, offset) as any[];

    return {
      data: rows.map(row => this.mapRow(row)),
      total: count
    };
  }

  findPendingRetry(): Task[] {
    const now = new Date().toISOString();
    const rows = this.db.prepare(`
      SELECT * FROM tasks
      WHERE status = 'WAITING_RETRY' AND next_retry_at <= ?
      ORDER BY next_retry_at ASC
    `).all(now) as any[];
    return rows.map(row => this.mapRow(row));
  }

  updateStatus(id: string, status: TaskStatus, errorMessage?: string, errorType?: string): Task {
    const before = this.findById(id);
    if (!before) throw new Error('Task not found');

    const now = new Date().toISOString();
    const updates: string[] = ['status = ?', 'updated_at = ?'];
    const values: any[] = [status, now];

    if (errorMessage !== undefined) {
      updates.push('error_message = ?');
      values.push(errorMessage);
    }
    if (errorType !== undefined) {
      updates.push('error_type = ?');
      values.push(errorType);
    }

    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE tasks SET ${updates.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);

    const after = this.findById(id)!;

    auditLogRepository.create({
      entityType: 'TASK',
      entityId: id,
      action: 'STATUS_CHANGE',
      beforeData: before,
      afterData: after,
      operatedBy: 'system',
      reason: `任务状态变更: ${status}`
    });

    return after;
  }

  incrementRetry(id: string, nextRetryAt: string): Task {
    const before = this.findById(id);
    if (!before) throw new Error('Task not found');

    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      UPDATE tasks 
      SET retry_count = retry_count + 1, next_retry_at = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(nextRetryAt, now, id);

    return this.findById(id)!;
  }

  retry(id: string, operatedBy: string): Task {
    const before = this.findById(id);
    if (!before) throw new Error('Task not found');

    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      UPDATE tasks 
      SET status = 'PENDING', retry_count = 0, error_message = NULL, error_type = NULL, next_retry_at = NULL, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(now, id);

    const after = this.findById(id)!;

    auditLogRepository.create({
      entityType: 'TASK',
      entityId: id,
      action: 'MANUAL_RETRY',
      beforeData: before,
      afterData: after,
      operatedBy,
      reason: '人工触发重试'
    });

    return after;
  }

  manualProcess(id: string, action: 'FIX' | 'SKIP' | 'CANCEL', remark: string, operatedBy: string): Task {
    const before = this.findById(id);
    if (!before) throw new Error('Task not found');

    const now = new Date().toISOString();
    const status: TaskStatus = action === 'CANCEL' ? 'PERMANENT_FAILED' : 'SUCCESS';

    const stmt = this.db.prepare(`
      UPDATE tasks 
      SET status = ?, error_message = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(status, remark, now, id);

    const after = this.findById(id)!;

    auditLogRepository.create({
      entityType: 'TASK',
      entityId: id,
      action: `MANUAL_${action}`,
      beforeData: before,
      afterData: after,
      operatedBy,
      reason: remark
    });

    return after;
  }

  getStats(): {
    total: number;
    pending: number;
    waitingRetry: number;
    waitingManual: number;
    failed: number;
    success: number;
  } {
    const row = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'PENDING' OR status = 'PROCESSING' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'WAITING_RETRY' THEN 1 ELSE 0 END) as waitingRetry,
        SUM(CASE WHEN status = 'WAITING_MANUAL' THEN 1 ELSE 0 END) as waitingManual,
        SUM(CASE WHEN status = 'PERMANENT_FAILED' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as success
      FROM tasks
    `).get() as any;

    return {
      total: row.total,
      pending: row.pending,
      waitingRetry: row.waitingRetry,
      waitingManual: row.waitingManual,
      failed: row.failed,
      success: row.success
    };
  }

  private mapRow(row: any): Task {
    return {
      id: row.id,
      batchId: row.batch_id,
      documentId: row.document_id,
      type: row.type,
      status: row.status,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      payload: JSON.parse(row.payload),
      errorMessage: row.error_message,
      errorType: row.error_type,
      nextRetryAt: row.next_retry_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export default new TaskRepository();
