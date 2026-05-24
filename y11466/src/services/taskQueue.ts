import PQueue from 'p-queue';
import { TaskRepository } from '../db';
import { Task, TaskStatus, TaskType, TaskLog } from '../types';
import dayjs from 'dayjs';

export interface TaskHandler {
  type: TaskType;
  handle: (task: Task) => Promise<void>;
}

export class TaskQueue {
  private queue: PQueue;
  private taskRepo: TaskRepository;
  private handlers: Map<TaskType, TaskHandler['handle']>;
  private isRunning: boolean;
  private pollInterval: NodeJS.Timeout | null;
  private currentUser: string;

  constructor(taskRepo: TaskRepository, concurrency = 2, currentUser = 'system') {
    this.taskRepo = taskRepo;
    this.currentUser = currentUser;
    this.queue = new PQueue({ concurrency });
    this.handlers = new Map();
    this.isRunning = false;
    this.pollInterval = null;
  }

  registerHandler(handler: TaskHandler): void {
    this.handlers.set(handler.type, handler.handle);
  }

  async enqueue(
    type: TaskType,
    payload: Record<string, unknown>,
    priority: Task['priority'] = 'medium',
    parentTaskId?: string
  ): Promise<Task> {
    const task = this.taskRepo.create(
      {
        type,
        payload,
        status: 'pending',
        priority,
        parentTaskId
      },
      this.currentUser
    );

    if (this.isRunning) {
      this.queue.add(() => this.processTask(task));
    }

    return task;
  }

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.loadPendingTasks();
    this.pollInterval = setInterval(() => this.loadPendingTasks(), 5000);
  }

  stop(): void {
    this.isRunning = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async loadPendingTasks(): Promise<void> {
    if (!this.isRunning) return;

    const pending = this.taskRepo.findPendingTasks();
    const failedRetry = this.taskRepo.findFailedRetryTasks();
    const allTasks = [...pending, ...failedRetry];

    for (const task of allTasks) {
      if (task.status === 'failed_retry' && task.retryAfter) {
        if (dayjs(task.retryAfter).isAfter(dayjs())) {
          continue;
        }
      }
      this.queue.add(() => this.processTask(task));
    }
  }

  private async processTask(task: Task): Promise<void> {
    const handler = this.handlers.get(task.type);
    if (!handler) {
      this.handleTaskError(task, new Error(`No handler registered for type: ${task.type}`), 'failed_permanent');
      return;
    }

    this.taskRepo.addLog(task.taskId, 'info', `Starting task ${task.type}`);
    this.taskRepo.updateStatus(task.id, 'running', this.currentUser);
    this.taskRepo.incrementAttempts(task.id, this.currentUser);

    try {
      await handler(task);
      this.taskRepo.updateStatus(task.id, 'completed', this.currentUser);
      this.taskRepo.addLog(task.taskId, 'info', `Task ${task.type} completed successfully`);
    } catch (error) {
      await this.handleTaskError(task, error as Error);
    }
  }

  private async handleTaskError(
    task: Task,
    error: Error,
    forceStatus?: TaskStatus
  ): Promise<void> {
    const errorMessage = error.message;
    const errorStack = error.stack;

    this.taskRepo.addLog(task.taskId, 'error', errorMessage, { stack: errorStack });

    if (forceStatus) {
      this.taskRepo.update(task.id, {
        status: forceStatus,
        errorMessage,
        errorStack
      }, this.currentUser);
      return;
    }

    const newAttempts = task.attempts + 1;
    
    if (newAttempts >= task.maxAttempts) {
      this.taskRepo.update(task.id, {
        status: 'failed_permanent',
        errorMessage,
        errorStack,
        failedAt: dayjs().toISOString()
      }, this.currentUser);
      this.taskRepo.addLog(task.taskId, 'error', 'Task failed permanently - max attempts reached');
    } else if (this.isTransientError(error)) {
      const retryAfter = dayjs().add(Math.pow(2, newAttempts), 'minute').toISOString();
      this.taskRepo.update(task.id, {
        status: 'failed_retry',
        errorMessage,
        errorStack,
        retryAfter,
        failedAt: dayjs().toISOString()
      }, this.currentUser);
      this.taskRepo.addLog(task.taskId, 'warn', `Task failed, will retry after ${retryAfter} (attempt ${newAttempts}/${task.maxAttempts})`);
    } else {
      this.taskRepo.update(task.id, {
        status: 'failed_manual',
        errorMessage,
        errorStack,
        failedAt: dayjs().toISOString()
      }, this.currentUser);
      this.taskRepo.addLog(task.taskId, 'error', 'Task requires manual intervention');
    }
  }

  private isTransientError(error: Error): boolean {
    const transientPatterns = [
      /timeout/i,
      /connection/i,
      /network/i,
      /temporarily/i,
      /busy/i,
      /lock/i,
      /deadlock/i
    ];
    return transientPatterns.some(pattern => pattern.test(error.message));
  }

  async retryTask(taskId: string): Promise<Task | null> {
    const task = this.taskRepo.findByTaskId(taskId);
    if (!task) return null;

    if (!['failed_retry', 'failed_manual', 'failed_permanent'].includes(task.status)) {
      return null;
    }

    const updated = this.taskRepo.update(task.id, {
      status: 'pending',
      errorMessage: undefined,
      errorStack: undefined,
      failedAt: undefined,
      retryAfter: undefined
    }, this.currentUser);

    if (updated && this.isRunning) {
      this.queue.add(() => this.processTask(updated));
    }

    return updated;
  }

  assignTask(taskId: string, assignedTo: string): Task | null {
    return this.taskRepo.update(taskId, { assignedTo }, this.currentUser);
  }

  getTaskStatus(taskId: string): Task | null {
    return this.taskRepo.findByTaskId(taskId);
  }

  getTaskLogs(taskId: string): TaskLog[] {
    return this.taskRepo.getLogs(taskId);
  }

  onIdle(): Promise<void> {
    return this.queue.onIdle();
  }

  get size(): number {
    return this.queue.size;
  }

  get pending(): number {
    return this.queue.pending;
  }
}
