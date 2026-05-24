import { v4 as uuidv4 } from 'uuid';
import { runQuery, getOne, getAll } from '../database';
import { AsyncTask, TaskStatus } from '../types';

function rowToAsyncTask(row: any): AsyncTask {
  return {
    id: row.id,
    type: row.type,
    status: row.status as TaskStatus,
    payload: row.payload,
    result: row.result,
    errorMessage: row.error_message,
    retryCount: row.retry_count,
    maxRetries: row.max_retries,
    nextRetryAt: row.next_retry_at,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at
  };
}

export async function createAsyncTask(data: Omit<AsyncTask, 'id' | 'createdAt' | 'retryCount'> & { maxRetries?: number }): Promise<AsyncTask> {
  const id = uuidv4();
  const now = new Date().toISOString();

  await runQuery(`
    INSERT INTO async_task (
      id, type, status, payload, result, error_message,
      retry_count, max_retries, next_retry_at,
      created_at, started_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.type,
    data.status,
    data.payload,
    data.result,
    data.errorMessage,
    0,
    data.maxRetries ?? 3,
    data.nextRetryAt,
    now,
    data.startedAt,
    data.completedAt
  ]);

  return getAsyncTaskById(id) as Promise<AsyncTask>;
}

export async function getAsyncTaskById(id: string): Promise<AsyncTask | null> {
  const row = await getOne('SELECT * FROM async_task WHERE id = ?', [id]);
  return row ? rowToAsyncTask(row) : null;
}

export async function getAsyncTasksByStatus(status: TaskStatus): Promise<AsyncTask[]> {
  const rows = await getAll(`
    SELECT * FROM async_task 
    WHERE status = ? 
    ORDER BY created_at ASC
  `, [status]);
  return rows.map(rowToAsyncTask);
}

export async function getPendingTasks(): Promise<AsyncTask[]> {
  const now = new Date().toISOString();
  const rows = await getAll(`
    SELECT * FROM async_task 
    WHERE status IN (?, ?) 
    AND (next_retry_at IS NULL OR next_retry_at <= ?)
    ORDER BY created_at ASC
  `, [TaskStatus.PENDING, TaskStatus.WAIT_RETRY, now]);
  return rows.map(rowToAsyncTask);
}

export async function updateAsyncTaskStatus(
  id: string,
  status: TaskStatus,
  options?: {
    errorMessage?: string;
    result?: string;
    incrementRetry?: boolean;
    nextRetryAt?: string;
  }
): Promise<AsyncTask | null> {
  const existing = await getAsyncTaskById(id);
  if (!existing) return null;

  const fields: string[] = ['status = ?'];
  const values: any[] = [status];

  if (options?.errorMessage !== undefined) {
    fields.push('error_message = ?');
    values.push(options.errorMessage);
  }

  if (options?.result !== undefined) {
    fields.push('result = ?');
    values.push(options.result);
  }

  if (options?.incrementRetry) {
    fields.push('retry_count = retry_count + 1');
  }

  if (options?.nextRetryAt !== undefined) {
    fields.push('next_retry_at = ?');
    values.push(options.nextRetryAt);
  }

  if (status === TaskStatus.PROCESSING) {
    fields.push('started_at = ?');
    values.push(new Date().toISOString());
  }

  if (status === TaskStatus.COMPLETED || status === TaskStatus.PERMANENT_FAILED) {
    fields.push('completed_at = ?');
    values.push(new Date().toISOString());
  }

  values.push(id);

  const sql = `UPDATE async_task SET ${fields.join(', ')} WHERE id = ?`;
  await runQuery(sql, values);

  return getAsyncTaskById(id);
}

export async function getFailedTasks(): Promise<AsyncTask[]> {
  const rows = await getAll(`
    SELECT * FROM async_task 
    WHERE status IN (?, ?, ?) 
    ORDER BY created_at DESC
  `, [TaskStatus.WAIT_RETRY, TaskStatus.WAIT_MANUAL, TaskStatus.PERMANENT_FAILED]);
  return rows.map(rowToAsyncTask);
}

export async function resetFailedTask(id: string): Promise<AsyncTask | null> {
  const existing = await getAsyncTaskById(id);
  if (!existing) return null;

  await runQuery(`
    UPDATE async_task 
    SET status = ?, retry_count = 0, error_message = NULL, next_retry_at = NULL
    WHERE id = ?
  `, [TaskStatus.PENDING, id]);

  return getAsyncTaskById(id);
}
