import { v4 as uuidv4 } from 'uuid';
import { run, get, all } from '../database';
import { AsyncTask, TaskStatus } from '../types';

export type TaskHandler = (task: AsyncTask) => Promise<void>;

function mapTaskRow(row: any): AsyncTask {
  return {
    id: row.id,
    batchId: row.batch_id,
    taskType: row.task_type,
    status: row.status,
    retryCount: row.retry_count,
    maxRetries: row.max_retries,
    lastError: row.last_error,
    nextRetryAt: row.next_retry_at,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    payload: row.payload
  };
}

export class TaskService {
  private static handlers: Map<string, TaskHandler> = new Map();
  private static isRunning: boolean = false;
  private static pollInterval: NodeJS.Timeout | null = null;

  static registerHandler(taskType: string, handler: TaskHandler): void {
    this.handlers.set(taskType, handler);
  }

  static async createTask(
    taskType: string,
    payload: Record<string, any>,
    batchId?: string,
    maxRetries: number = 3
  ): Promise<AsyncTask> {
    const id = uuidv4();
    const now = new Date().toISOString();

    await run(
      `INSERT INTO async_tasks (id, batch_id, task_type, status, retry_count, max_retries, created_at, payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, batchId || null, taskType, TaskStatus.PENDING, 0, maxRetries, now, JSON.stringify(payload)]
    );

    return this.getTaskById(id) as Promise<AsyncTask>;
  }

  static async getTaskById(id: string): Promise<AsyncTask | undefined> {
    const row = await get<any>(`SELECT * FROM async_tasks WHERE id = ?`, [id]);
    return row ? mapTaskRow(row) : undefined;
  }

  static async listTasks(
    status?: TaskStatus,
    page: number = 1,
    pageSize: number = 50
  ): Promise<{ data: AsyncTask[]; total: number }> {
    const offset = (page - 1) * pageSize;
    let sql = `SELECT * FROM async_tasks`;
    let countSql = `SELECT COUNT(*) as count FROM async_tasks`;
    const params: any[] = [];

    if (status) {
      sql += ` WHERE status = ?`;
      countSql += ` WHERE status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;

    const rows = await all<any>(sql, [...params, pageSize, offset]);
    const totalResult = await all<{ count: number }>(countSql, params);

    return { data: rows.map(r => mapTaskRow(r)), total: totalResult[0]?.count || 0 };
  }

  static async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    error?: string,
    nextRetryAt?: string
  ): Promise<void> {
    const now = new Date().toISOString();
    let sql = `UPDATE async_tasks SET status = ?`;
    const params: any[] = [status];

    if (error) {
      sql += `, last_error = ?`;
      params.push(error);
    }

    if (nextRetryAt) {
      sql += `, next_retry_at = ?`;
      params.push(nextRetryAt);
    }

    if (status === TaskStatus.COMPLETED) {
      sql += `, completed_at = ?`;
      params.push(now);
    }

    if (status === TaskStatus.PROCESSING) {
      sql += `, started_at = ?`;
      params.push(now);
    }

    sql += ` WHERE id = ?`;
    params.push(taskId);

    await run(sql, params);
  }

  static async incrementRetryCount(taskId: string): Promise<void> {
    await run(
      `UPDATE async_tasks SET retry_count = retry_count + 1 WHERE id = ?`,
      [taskId]
    );
  }

  static async getPendingTasks(): Promise<AsyncTask[]> {
    const now = new Date().toISOString();
    const rows = await all<any>(
      `SELECT * FROM async_tasks 
       WHERE status IN (?, ?) 
       AND (next_retry_at IS NULL OR next_retry_at <= ?)
       ORDER BY created_at ASC`,
      [TaskStatus.PENDING, TaskStatus.PENDING_RETRY, now]
    );
    return rows.map(r => mapTaskRow(r));
  }

  static async recoverProcessingTasks(): Promise<number> {
    const rows = await all<any>(
      `SELECT * FROM async_tasks WHERE status = ?`,
      [TaskStatus.PROCESSING]
    );

    if (rows.length === 0) {
      return 0;
    }

    for (const row of rows) {
      const task = mapTaskRow(row);
      const newRetryCount = task.retryCount + 1;

      if (newRetryCount >= task.maxRetries) {
        await this.updateTaskStatus(
          task.id,
          TaskStatus.PENDING_MANUAL,
          `服务中断后恢复：任务在 processing 状态时被中断，重试次数 ${newRetryCount}/${task.maxRetries}，需人工介入`
        );
      } else {
        const nextRetryAt = new Date(Date.now() + Math.pow(2, newRetryCount) * 60000).toISOString();
        await run(
          `UPDATE async_tasks SET status = ?, retry_count = ?, last_error = ?, next_retry_at = ? WHERE id = ?`,
          [TaskStatus.PENDING_RETRY, newRetryCount, `服务中断后恢复：任务在 processing 状态时被中断，自动重试 ${newRetryCount}/${task.maxRetries}`, nextRetryAt, task.id]
        );
      }
    }

    console.log(`[TaskService] 恢复了 ${rows.length} 个中断的 processing 状态任务`);
    return rows.length;
  }

  static async processTask(task: AsyncTask): Promise<void> {
    const handler = this.handlers.get(task.taskType);
    
    if (!handler) {
      await this.handleTaskFailure(task, `未找到任务处理器: ${task.taskType}`, true);
      return;
    }

    try {
      await this.updateTaskStatus(task.id, TaskStatus.PROCESSING);
      await handler(task);
      await this.updateTaskStatus(task.id, TaskStatus.COMPLETED);
    } catch (error: any) {
      await this.handleTaskFailure(task, error.message, false);
    }
  }

  private static async handleTaskFailure(
    task: AsyncTask,
    error: string,
    isPermanent: boolean
  ): Promise<void> {
    if (isPermanent) {
      await this.updateTaskStatus(task.id, TaskStatus.PERMANENT_FAILED, error);
      return;
    }

    const newRetryCount = task.retryCount + 1;

    if (newRetryCount >= task.maxRetries) {
      await this.updateTaskStatus(task.id, TaskStatus.PERMANENT_FAILED, error);
    } else if (newRetryCount >= task.maxRetries - 1) {
      await this.updateTaskStatus(task.id, TaskStatus.PENDING_MANUAL, error);
    } else {
      const nextRetryAt = new Date(Date.now() + Math.pow(2, newRetryCount) * 60000).toISOString();
      await this.incrementRetryCount(task.id);
      await this.updateTaskStatus(task.id, TaskStatus.PENDING_RETRY, error, nextRetryAt);
    }
  }

  static async manuallyRetryTask(taskId: string, operatedBy: string): Promise<AsyncTask> {
    const task = await this.getTaskById(taskId);
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    if (task.status !== TaskStatus.PENDING_MANUAL && task.status !== TaskStatus.PERMANENT_FAILED) {
      throw new Error(`只有待人工处理或永久失败的任务才能手动重试`);
    }

    await run(
      `UPDATE async_tasks SET status = ?, retry_count = 0, last_error = NULL WHERE id = ?`,
      [TaskStatus.PENDING, taskId]
    );

    return this.getTaskById(taskId) as Promise<AsyncTask>;
  }

  static async startWorker(pollIntervalMs: number = 5000): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('[TaskService] 异步任务处理器正在启动...');

    const recovered = await this.recoverProcessingTasks();
    console.log(`[TaskService] 异步任务处理器已启动，恢复 ${recovered} 个中断任务`);

    this.pollInterval = setInterval(async () => {
      try {
        const tasks = await this.getPendingTasks();
        for (const task of tasks) {
          await this.processTask(task);
        }
      } catch (error) {
        console.error('[TaskService] 任务处理循环出错:', error);
      }
    }, pollIntervalMs);
  }

  static stopWorker(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isRunning = false;
    console.log('[TaskService] 异步任务处理器已停止');
  }

  static async getTaskStats(): Promise<{
    total: number;
    byStatus: Record<TaskStatus, number>;
  }> {
    const rows = await all<any>(`SELECT * FROM async_tasks`);
    const allTasks = rows.map(r => mapTaskRow(r));
    
    const byStatus = {} as Record<TaskStatus, number>;
    Object.values(TaskStatus).forEach(s => byStatus[s as TaskStatus] = 0);
    allTasks.forEach(t => {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    });

    return {
      total: allTasks.length,
      byStatus
    };
  }
}
