import { Repository } from 'typeorm';
import { AsyncTask, TaskStatus, TaskType } from '../entities/AsyncTask';
import { AppDataSource } from '../database';
import { auditService } from './AuditService';
import * as dayjs from 'dayjs';

export interface CreateTaskOptions {
  batchId?: string;
  taskType: TaskType;
  payload?: Record<string, any>;
  maxRetries?: number;
  operatorId?: string;
  operatorName?: string;
}

export interface TaskHandler {
  (task: AsyncTask): Promise<void>;
}

export class AsyncTaskService {
  private taskRepository: Repository<AsyncTask>;
  private handlers: Map<TaskType, TaskHandler> = new Map();
  private isRunning: boolean = false;
  private pollInterval: number = 5000;

  constructor() {
    this.taskRepository = AppDataSource.getRepository(AsyncTask);
  }

  async createTask(options: CreateTaskOptions): Promise<AsyncTask> {
    const task = this.taskRepository.create({
      batchId: options.batchId,
      taskType: options.taskType,
      status: 'pending',
      retryCount: 0,
      maxRetries: options.maxRetries || 3,
      payload: options.payload,
      createdBy: options.operatorId,
      updatedBy: options.operatorId,
    });

    const saved = await this.taskRepository.save(task);

    await auditService.logCreate('async_task', saved.id, saved, {
      batchId: options.batchId,
      operatorId: options.operatorId,
      operatorName: options.operatorName,
    });

    return saved;
  }

  async getTaskById(id: string): Promise<AsyncTask | null> {
    return await this.taskRepository.findOne({ where: { id } });
  }

  async getTasksByBatch(batchId: string): Promise<AsyncTask[]> {
    return await this.taskRepository.find({
      where: { batchId },
      order: { createdAt: 'DESC' },
    });
  }

  async getPendingTasks(): Promise<AsyncTask[]> {
    return await this.taskRepository.find({
      where: [{ status: 'pending' }, { status: 'retry_waiting' }],
      order: { createdAt: 'ASC' },
    });
  }

  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    options: {
      errorMessage?: string;
      errorStack?: string;
      errorCode?: string;
      progress?: number;
      processedItems?: number;
      result?: Record<string, any>;
      operatorId?: string;
    } = {}
  ): Promise<AsyncTask> {
    const task = await this.getTaskById(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    const oldStatus = task.status;

    task.status = status;
    task.updatedBy = options.operatorId;

    if (status === 'processing') {
      task.startedAt = new Date();
    } else if (status === 'completed') {
      task.completedAt = new Date();
      task.progress = 100;
    } else if (status === 'failed' || status === 'manual_waiting') {
      task.failedAt = new Date();
      task.errorMessage = options.errorMessage;
      task.errorStack = options.errorStack;
      task.errorCode = options.errorCode;
    } else if (status === 'retry_waiting') {
      task.retryCount++;
      task.nextRetryAt = dayjs().add(task.retryCount * 5, 'minute').toDate();
    }

    if (options.progress !== undefined) {
      task.progress = options.progress;
    }
    if (options.processedItems !== undefined) {
      task.processedItems = options.processedItems;
    }
    if (options.result !== undefined) {
      task.result = options.result;
    }

    const saved = await this.taskRepository.save(task);

    await auditService.logStatusChange('async_task', taskId, oldStatus, status, options.errorMessage || '', {
      batchId: task.batchId,
      operatorId: options.operatorId,
    });

    return saved;
  }

  async assignToManual(taskId: string, assignedTo: string, resolutionNote?: string, operatorId?: string): Promise<AsyncTask> {
    const task = await this.getTaskById(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    task.status = 'manual_waiting';
    task.assignedTo = assignedTo;
    task.resolutionNote = resolutionNote;
    task.updatedBy = operatorId;

    const saved = await this.taskRepository.save(task);

    await auditService.log({
      action: 'update',
      entityType: 'async_task',
      entityId: taskId,
      batchId: task.batchId,
      operatorId,
      fieldName: 'assignedTo',
      newValue: assignedTo,
      changeReason: '转人工处理',
    });

    return saved;
  }

  async resolveManualTask(taskId: string, resolved: boolean, resolutionNote?: string, operatorId?: string): Promise<AsyncTask> {
    const task = await this.getTaskById(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    if (task.status !== 'manual_waiting') {
      throw new Error('只有待人工处理的任务可以解决');
    }

    if (resolved) {
      task.status = 'completed';
      task.completedAt = new Date();
      task.progress = 100;
    } else {
      task.status = 'failed';
      task.failedAt = new Date();
    }
    task.resolutionNote = resolutionNote;
    task.updatedBy = operatorId;

    return await this.taskRepository.save(task);
  }

  registerHandler(taskType: TaskType, handler: TaskHandler): void {
    this.handlers.set(taskType, handler);
  }

  async processTask(task: AsyncTask): Promise<void> {
    const handler = this.handlers.get(task.taskType);
    if (!handler) {
      throw new Error(`未找到任务类型 ${task.taskType} 的处理器`);
    }

    await this.updateTaskStatus(task.id, 'processing');

    try {
      await handler(task);
      await this.updateTaskStatus(task.id, 'completed');
    } catch (error: any) {
      if (task.retryCount < task.maxRetries) {
        await this.updateTaskStatus(task.id, 'retry_waiting', {
          errorMessage: error.message,
          errorStack: error.stack,
        });
      } else {
        await this.updateTaskStatus(task.id, 'manual_waiting', {
          errorMessage: error.message,
          errorStack: error.stack,
        });
      }
    }
  }

  async startWorker(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('异步任务 worker 已启动');

    while (this.isRunning) {
      try {
        const tasks = await this.getPendingTasks();
        const now = new Date();

        for (const task of tasks) {
          if (task.status === 'retry_waiting' && task.nextRetryAt && task.nextRetryAt > now) {
            continue;
          }
          await this.processTask(task);
        }
      } catch (error) {
        console.error('处理任务时出错:', error);
      }

      await this.sleep(this.pollInterval);
    }
  }

  stopWorker(): void {
    this.isRunning = false;
    console.log('异步任务 worker 已停止');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async retryTask(taskId: string, operatorId?: string): Promise<AsyncTask> {
    const task = await this.getTaskById(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    if (task.status !== 'failed' && task.status !== 'manual_waiting') {
      throw new Error('只有失败或待人工处理的任务可以重试');
    }

    task.status = 'pending';
    task.retryCount = 0;
    task.errorMessage = undefined;
    task.errorStack = undefined;
    task.nextRetryAt = undefined;
    task.updatedBy = operatorId;

    return await this.taskRepository.save(task);
  }
}

export const asyncTaskService = new AsyncTaskService();
