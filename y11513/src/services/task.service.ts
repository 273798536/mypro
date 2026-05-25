import { v4 as uuidv4 } from 'uuid';
import { db } from '../models/database';
import { AsyncTask, TaskStatus, RecordType, DataRecord } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';
import { recordService } from './record.service';

export class TaskService {
  private isRunning: boolean = false;

  public async hasUnfinishedTask(
    recordId: string,
    recordType: RecordType
  ): Promise<boolean> {
    const row = await db.get(
      `SELECT COUNT(*) as count FROM async_tasks 
       WHERE record_id = ? AND record_type = ? 
       AND status IN (?, ?, ?)`,
      [
        recordId, recordType,
        TaskStatus.PENDING,
        TaskStatus.PROCESSING,
        TaskStatus.WAITING_RETRY
      ]
    );

    return (row as any).count > 0;
  }

  public async getUnfinishedTask(
    recordId: string,
    recordType: RecordType
  ): Promise<AsyncTask | undefined> {
    const row = await db.get(
      `SELECT * FROM async_tasks 
       WHERE record_id = ? AND record_type = ? 
       AND status IN (?, ?, ?)
       ORDER BY created_at DESC LIMIT 1`,
      [
        recordId, recordType,
        TaskStatus.PENDING,
        TaskStatus.PROCESSING,
        TaskStatus.WAITING_RETRY
      ]
    );

    if (!row) return undefined;
    return this.mapRowToTask(row);
  }

  public async createTask(
    recordId: string,
    recordType: RecordType
  ): Promise<AsyncTask> {
    const existingTask = await this.getUnfinishedTask(recordId, recordType);
    if (existingTask) {
      logger.info('Skipping duplicate task creation - unfinished task exists', {
        existingTaskId: existingTask.id,
        recordId,
        recordType,
        status: existingTask.status
      });
      return existingTask;
    }

    const taskId = uuidv4();
    const now = Date.now();

    await db.run(
      `INSERT INTO async_tasks (
        id, record_id, record_type, status, retry_count, max_retries,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        taskId, recordId, recordType, TaskStatus.PENDING,
        0, config.task.maxRetries, now, now
      ]
    );

    logger.info('Created async task', { taskId, recordId, recordType });

    return this.getTaskById(taskId) as Promise<AsyncTask>;
  }

  public async getTaskById(taskId: string): Promise<AsyncTask | undefined> {
    const row = await db.get(
      'SELECT * FROM async_tasks WHERE id = ?',
      [taskId]
    );

    if (!row) return undefined;

    return this.mapRowToTask(row);
  }

  public async getTasksByStatus(status: TaskStatus): Promise<AsyncTask[]> {
    const rows = await db.all(
      'SELECT * FROM async_tasks WHERE status = ? ORDER BY created_at ASC',
      [status]
    );

    return rows.map(row => this.mapRowToTask(row));
  }

  public async getPendingTasks(): Promise<AsyncTask[]> {
    const now = Date.now();
    const rows = await db.all(
      `SELECT * FROM async_tasks 
       WHERE status IN (?, ?) 
       AND (next_retry_at IS NULL OR next_retry_at <= ?)
       ORDER BY created_at ASC`,
      [TaskStatus.PENDING, TaskStatus.WAITING_RETRY, now]
    );

    return rows.map(row => this.mapRowToTask(row));
  }

  public async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    error?: string
  ): Promise<void> {
    const now = Date.now();
    let nextRetryAt: number | null = null;

    if (status === TaskStatus.WAITING_RETRY) {
      nextRetryAt = now + config.task.retryInterval;
    }

    await db.run(
      `UPDATE async_tasks SET 
        status = ?, 
        last_error = ?, 
        next_retry_at = ?,
        updated_at = ?
       WHERE id = ?`,
      [status, error || null, nextRetryAt, now, taskId]
    );

    logger.info('Updated task status', { taskId, status, error });
  }

  public async incrementRetryCount(taskId: string): Promise<number> {
    const task = await this.getTaskById(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);

    const newRetryCount = task.retryCount + 1;
    const now = Date.now();

    await db.run(
      `UPDATE async_tasks SET 
        retry_count = ?,
        updated_at = ?
       WHERE id = ?`,
      [newRetryCount, now, taskId]
    );

    return newRetryCount;
  }

  public async markTaskSuccess(taskId: string): Promise<void> {
    const now = Date.now();
    await db.run(
      `UPDATE async_tasks SET 
        status = ?, 
        processed_at = ?,
        updated_at = ?
       WHERE id = ?`,
      [TaskStatus.SUCCESS, now, now, taskId]
    );

    logger.info('Task completed successfully', { taskId });
  }

  public async markTaskPermanentFailed(taskId: string, error: string): Promise<void> {
    const now = Date.now();
    await db.run(
      `UPDATE async_tasks SET 
        status = ?, 
        last_error = ?,
        updated_at = ?
       WHERE id = ?`,
      [TaskStatus.PERMANENT_FAILED, error, now, taskId]
    );

    logger.error('Task permanently failed', { taskId, error });
  }

  public async markTaskWaitingManual(taskId: string, error: string): Promise<void> {
    const now = Date.now();
    await db.run(
      `UPDATE async_tasks SET 
        status = ?, 
        last_error = ?,
        updated_at = ?
       WHERE id = ?`,
      [TaskStatus.WAITING_MANUAL, error, now, taskId]
    );

    logger.warn('Task waiting for manual intervention', { taskId, error });
  }

  public async retryTask(taskId: string): Promise<void> {
    const task = await this.getTaskById(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);

    await this.updateTaskStatus(taskId, TaskStatus.PENDING);
    await db.run(
      `UPDATE async_tasks SET retry_count = 0 WHERE id = ?`,
      [taskId]
    );

    logger.info('Task reset for retry', { taskId });
  }

  public async processTask(task: AsyncTask): Promise<void> {
    logger.info('Processing task', { taskId: task.id });

    try {
      await this.updateTaskStatus(task.id, TaskStatus.PROCESSING);

      const record = await recordService.getRecordById(task.recordType, task.recordId);
      if (!record) {
        throw new Error(`Record not found: ${task.recordId}`);
      }

      await this.processRecord(record);

      await this.markTaskSuccess(task.id);

    } catch (error) {
      const err = error as Error;
      const retryCount = await this.incrementRetryCount(task.id);

      if (retryCount >= task.maxRetries) {
        if (this.isManualInterventionRequired(err)) {
          await this.markTaskWaitingManual(task.id, err.message);
        } else {
          await this.markTaskPermanentFailed(task.id, err.message);
        }
      } else {
        await this.updateTaskStatus(task.id, TaskStatus.WAITING_RETRY, err.message);
      }

      logger.error('Task processing failed', {
        taskId: task.id,
        error: err.message,
        retryCount,
        maxRetries: task.maxRetries
      });
    }
  }

  private async processRecord(record: DataRecord): Promise<void> {
    const validationResult = this.validateRecord(record);
    if (!validationResult.valid) {
      throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
    }

    await new Promise(resolve => setTimeout(resolve, 100));

    logger.info('Record processed successfully', {
      recordId: record.id,
      recordType: record.recordType
    });
  }

  private validateRecord(record: DataRecord): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (record.recordType) {
      case RecordType.BORROW_APPLICATION:
        const borrowApp = record as any;
        if (!borrowApp.applicationNo) errors.push('applicationNo is required');
        if (!borrowApp.readerId) errors.push('readerId is required');
        if (!borrowApp.isbn) errors.push('isbn is required');
        break;

      case RecordType.EXPRESS_ORDER:
        const express = record as any;
        if (!express.expressNo) errors.push('expressNo is required');
        if (!express.relatedApplicationNo) errors.push('relatedApplicationNo is required');
        if (express.freight < 0) errors.push('freight cannot be negative');
        break;

      case RecordType.COMPENSATION_RECORD:
        const comp = record as any;
        if (!comp.compensationNo) errors.push('compensationNo is required');
        if (!comp.compensationType) errors.push('compensationType is required');
        if (comp.amount < 0) errors.push('amount cannot be negative');
        break;

      case RecordType.SHIFT_RECORD:
        const shift = record as any;
        if (!shift.shiftNo) errors.push('shiftNo is required');
        if (!shift.operatorId) errors.push('operatorId is required');
        if (shift.processedRecords < 0) errors.push('processedRecords cannot be negative');
        break;
    }

    return { valid: errors.length === 0, errors };
  }

  private isManualInterventionRequired(error: Error): boolean {
    const manualErrorPatterns = [
      'fee_calculation_error',
      'conflicting',
      'overlap',
      'validation failed',
    ];

    return manualErrorPatterns.some(pattern =>
      error.message.toLowerCase().includes(pattern)
    );
  }

  public async resetStuckProcessingTasks(): Promise<number> {
    const now = Date.now();
    const result = await db.run(
      `UPDATE async_tasks SET 
        status = ?, 
        retry_count = retry_count,
        next_retry_at = ?,
        updated_at = ?
       WHERE status = ?`,
      [TaskStatus.PENDING, now, now, TaskStatus.PROCESSING]
    );

    const resetCount = result.changes || 0;
    if (resetCount > 0) {
      logger.info('Reset stuck processing tasks to pending', { count: resetCount });
    }

    return resetCount;
  }

  public startTaskProcessor(): void {
    if (this.isRunning) {
      logger.warn('Task processor is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting task processor');

    this.resetStuckProcessingTasks().catch(err => {
      logger.error('Failed to reset stuck processing tasks', err);
    });

    const processLoop = async () => {
      while (this.isRunning) {
        try {
          const tasks = await this.getPendingTasks();
          if (tasks.length > 0) {
            logger.info(`Found ${tasks.length} pending tasks`);
            for (const task of tasks) {
              await this.processTask(task);
            }
          }
        } catch (error) {
          logger.error('Error in task processing loop', error as Error);
        }

        await new Promise(resolve =>
          setTimeout(resolve, config.task.checkInterval)
        );
      }
    };

    processLoop().catch(err => {
      logger.error('Task processor failed', err);
      this.isRunning = false;
    });
  }

  public stopTaskProcessor(): void {
    logger.info('Stopping task processor');
    this.isRunning = false;
  }

  public async getAllTasks(params: { page?: number; pageSize?: number; status?: TaskStatus } = {}): Promise<{ tasks: AsyncTask[]; total: number }> {
    const { page = 1, pageSize = 20, status } = params;

    let whereClause = '';
    let queryParams: any[] = [];

    if (status) {
      whereClause = 'WHERE status = ?';
      queryParams.push(status);
    }

    const countSql = `SELECT COUNT(*) as count FROM async_tasks ${whereClause}`;
    const countResult = await db.get(countSql, queryParams);
    const total = (countResult as any).count;

    const offset = (page - 1) * pageSize;
    const tasksSql = `SELECT * FROM async_tasks ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const rows = await db.all(tasksSql, [...queryParams, pageSize, offset]);

    const tasks = rows.map(row => this.mapRowToTask(row));

    return { tasks, total };
  }

  private mapRowToTask(row: any): AsyncTask {
    return {
      id: row.id,
      recordId: row.record_id,
      recordType: row.record_type,
      status: row.status,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      nextRetryAt: row.next_retry_at,
      lastError: row.last_error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      processedAt: row.processed_at,
    };
  }
}

export const taskService = new TaskService();
