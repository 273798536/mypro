import Database from 'better-sqlite3';
import { BaseRepository } from './baseRepository';
import { Task, TaskLog, TaskStatus, TaskType } from '../types';

interface TaskRow {
  id: string;
  task_id: string;
  type: string;
  status: string;
  priority: string;
  payload: string | null;
  result: string | null;
  attempts: number;
  max_attempts: number;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  error_message: string | null;
  error_stack: string | null;
  error_code: string | null;
  retry_after: string | null;
  assigned_to: string | null;
  parent_task_id: string | null;
  depends_on: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

interface TaskLogRow {
  id: string;
  task_id: string;
  timestamp: string;
  level: string;
  message: string;
  details: string | null;
}

export class TaskRepository extends BaseRepository<Task, TaskRow> {
  protected tableName = 'tasks';

  constructor(db: Database.Database) {
    super(db);
  }

  protected rowToEntity(row: TaskRow): Task {
    return {
      id: row.id,
      taskId: row.task_id,
      type: row.type as TaskType,
      status: row.status as TaskStatus,
      priority: row.priority as Task['priority'],
      payload: this.deserialize<Record<string, unknown>>(row.payload) || {},
      result: this.deserialize<Record<string, unknown>>(row.result) || undefined,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      startedAt: row.started_at || undefined,
      completedAt: row.completed_at || undefined,
      failedAt: row.failed_at || undefined,
      errorMessage: row.error_message || undefined,
      errorStack: row.error_stack || undefined,
      errorCode: row.error_code || undefined,
      retryAfter: row.retry_after || undefined,
      assignedTo: row.assigned_to || undefined,
      parentTaskId: row.parent_task_id || undefined,
      dependsOn: this.deserialize<string[]>(row.depends_on) || undefined,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  create(data: Partial<Task>, createdBy: string): Task {
    const id = this.generateId();
    const now = this.now();
    
    const stmt = this.db.prepare(`
      INSERT INTO tasks (
        id, task_id, type, status, priority, payload, result, attempts, max_attempts,
        started_at, completed_at, failed_at, error_message, error_stack, error_code,
        retry_after, assigned_to, parent_task_id, depends_on,
        created_by, updated_by, created_at, updated_at
      ) VALUES (
        @id, @taskId, @type, @status, @priority, @payload, @result, @attempts, @maxAttempts,
        @startedAt, @completedAt, @failedAt, @errorMessage, @errorStack, @errorCode,
        @retryAfter, @assignedTo, @parentTaskId, @dependsOn,
        @createdBy, @createdBy, @createdAt, @createdAt
      )
    `);

    stmt.run({
      id,
      taskId: data.taskId || id,
      type: data.type,
      status: data.status || 'pending',
      priority: data.priority || 'medium',
      payload: data.payload ? this.serialize(data.payload) : null,
      result: data.result ? this.serialize(data.result) : null,
      attempts: data.attempts || 0,
      maxAttempts: data.maxAttempts || 3,
      startedAt: data.startedAt || null,
      completedAt: data.completedAt || null,
      failedAt: data.failedAt || null,
      errorMessage: data.errorMessage || null,
      errorStack: data.errorStack || null,
      errorCode: data.errorCode || null,
      retryAfter: data.retryAfter || null,
      assignedTo: data.assignedTo || null,
      parentTaskId: data.parentTaskId || null,
      dependsOn: data.dependsOn ? this.serialize(data.dependsOn) : null,
      createdBy,
      createdAt: now
    });

    return this.findById(id)!;
  }

  update(id: string, data: Partial<Task>, updatedBy: string): Task | null {
    const now = this.now();
    const updates: string[] = [];
    const params: Record<string, unknown> = { id, updatedBy, updatedAt: now };

    const fieldMappings: Record<string, [string, boolean]> = {
      taskId: ['task_id', false],
      type: ['type', false],
      status: ['status', false],
      priority: ['priority', false],
      payload: ['payload', true],
      result: ['result', true],
      attempts: ['attempts', false],
      maxAttempts: ['max_attempts', false],
      startedAt: ['started_at', false],
      completedAt: ['completed_at', false],
      failedAt: ['failed_at', false],
      errorMessage: ['error_message', false],
      errorStack: ['error_stack', false],
      errorCode: ['error_code', false],
      retryAfter: ['retry_after', false],
      assignedTo: ['assigned_to', false],
      parentTaskId: ['parent_task_id', false],
      dependsOn: ['depends_on', true]
    };

    for (const [key, value] of Object.entries(data)) {
      const mapping = fieldMappings[key];
      if (mapping && value !== undefined) {
        const [field, serialize] = mapping;
        updates.push(`${field} = @${key}`);
        params[key] = serialize ? this.serialize(value) : value;
      }
    }

    if (updates.length === 0) return this.findById(id);

    const sql = `
      UPDATE tasks 
      SET ${updates.join(', ')}, updated_by = @updatedBy, updated_at = @updatedAt 
      WHERE id = @id
    `;

    this.db.prepare(sql).run(params);
    return this.findById(id);
  }

  findById(id: string): Task | null {
    const row = this.db.prepare(
      'SELECT * FROM tasks WHERE id = ?'
    ).get(id) as TaskRow | undefined;
    
    return row ? this.rowToEntity(row) : null;
  }

  findByTaskId(taskId: string): Task | null {
    const row = this.db.prepare(
      'SELECT * FROM tasks WHERE task_id = ?'
    ).get(taskId) as TaskRow | undefined;
    
    return row ? this.rowToEntity(row) : null;
  }

  findByStatus(status: TaskStatus): Task[] {
    const rows = this.db.prepare(`
      SELECT * FROM tasks 
      WHERE status = ? 
      ORDER BY 
        CASE priority 
          WHEN 'urgent' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END,
        created_at ASC
    `).all(status) as TaskRow[];
    
    return rows.map(row => this.rowToEntity(row));
  }

  findPendingTasks(): Task[] {
    return this.findByStatus('pending');
  }

  findFailedRetryTasks(): Task[] {
    const rows = this.db.prepare(`
      SELECT * FROM tasks 
      WHERE status = 'failed_retry' 
      ORDER BY 
        CASE priority 
          WHEN 'urgent' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END,
        attempts ASC,
        created_at ASC
    `).all() as TaskRow[];
    
    return rows.map(row => this.rowToEntity(row));
  }

  updateStatus(taskId: string, status: TaskStatus, updatedBy: string): Task | null {
    const now = this.now();
    const updates: Record<string, unknown> = {
      taskId,
      status,
      updatedBy,
      updatedAt: now
    };

    if (status === 'running') {
      updates['startedAt'] = now;
    } else if (status === 'completed') {
      updates['completedAt'] = now;
    } else if (status.startsWith('failed')) {
      updates['failedAt'] = now;
    }

    return this.update(taskId, updates as Partial<Task>, updatedBy);
  }

  incrementAttempts(taskId: string, updatedBy: string): Task | null {
    const task = this.findByTaskId(taskId);
    if (!task) return null;
    
    return this.update(task.id, { attempts: task.attempts + 1 }, updatedBy);
  }

  addLog(taskId: string, level: TaskLog['level'], message: string, details?: Record<string, unknown>): void {
    const id = this.generateId();
    const stmt = this.db.prepare(`
      INSERT INTO task_logs (id, task_id, level, message, details)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      taskId,
      level,
      message,
      details ? this.serialize(details) : null
    );
  }

  getLogs(taskId: string): TaskLog[] {
    const rows = this.db.prepare(`
      SELECT * FROM task_logs 
      WHERE task_id = ? 
      ORDER BY timestamp ASC
    `).all(taskId) as TaskLogRow[];
    
    return rows.map(row => ({
      id: row.id,
      taskId: row.task_id,
      timestamp: row.timestamp,
      level: row.level as TaskLog['level'],
      message: row.message,
      details: this.deserialize<Record<string, unknown>>(row.details) || undefined
    }));
  }
}
