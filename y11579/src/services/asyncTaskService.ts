import { AsyncTask, TaskStatus } from '../types';
import { AsyncTaskRepository } from '../db/repositories';
import { config } from '../config';
import { logger } from '../utils/logger';
import { LedgerService } from './ledgerService';
import { BatchStrategy, Role } from '../types';

export type TaskHandler = (payload: Record<string, unknown>) => Promise<void>;

export class AsyncTaskService {
  private static handlers: Map<string, TaskHandler> = new Map();

  static registerHandler(taskType: string, handler: TaskHandler): void {
    this.handlers.set(taskType, handler);
    logger.info(`已注册任务处理器: ${taskType}`);
  }

  static async createTask(
    taskType: string,
    payload: Record<string, unknown>,
    maxRetries: number = config.asyncTask.maxRetries
  ): Promise<AsyncTask> {
    return AsyncTaskRepository.create({
      taskType,
      payload,
      status: TaskStatus.PENDING,
      retryCount: 0,
      maxRetries
    });
  }

  static async processTask(taskId: string): Promise<void> {
    const task = await AsyncTaskRepository.findById(taskId);
    if (!task) {
      logger.error(`任务不存在: ${taskId}`);
      return;
    }

    const handler = this.handlers.get(task.taskType);
    if (!handler) {
      logger.error(`未找到任务处理器: ${task.taskType}`);
      await this.markAsFailed(task, `未找到任务处理器: ${task.taskType}`, true);
      return;
    }

    try {
      await AsyncTaskRepository.update(task.id, {
        status: TaskStatus.PROCESSING,
        lastRunAt: new Date().toISOString()
      });

      await handler(task.payload);

      await AsyncTaskRepository.update(task.id, {
        status: TaskStatus.COMPLETED,
        completedAt: new Date().toISOString()
      });

      logger.info(`任务完成: ${task.id} (${task.taskType})`);
    } catch (error) {
      await this.handleTaskFailure(task, error as Error);
    }
  }

  private static async handleTaskFailure(task: AsyncTask, error: Error): Promise<void> {
    const newRetryCount = task.retryCount + 1;
    const isPermanent = newRetryCount >= task.maxRetries;

    if (isPermanent) {
      await this.markAsFailed(task, error.message, true, error.stack);
      logger.error(`任务永久失败: ${task.id}, 错误: ${error.message}`);
    } else {
      const nextRunAt = new Date(Date.now() + config.asyncTask.retryDelay).toISOString();
      
      await AsyncTaskRepository.update(task.id, {
        status: TaskStatus.WAITING_RETRY,
        retryCount: newRetryCount,
        errorMessage: error.message,
        errorStack: error.stack,
        nextRunAt
      });

      logger.warn(`任务失败，等待重试: ${task.id}, 重试次数: ${newRetryCount}/${task.maxRetries}`);
    }
  }

  private static async markAsFailed(
    task: AsyncTask,
    errorMessage: string,
    permanent: boolean,
    errorStack?: string
  ): Promise<void> {
    await AsyncTaskRepository.update(task.id, {
      status: permanent ? TaskStatus.PERMANENT_FAILED : TaskStatus.WAITING_MANUAL,
      errorMessage,
      errorStack
    });
  }

  static async processPendingTasks(): Promise<void> {
    const tasks = await AsyncTaskRepository.findPending();
    
    for (const task of tasks) {
      await this.processTask(task.id);
    }
  }

  static async retryTask(taskId: string): Promise<AsyncTask> {
    const task = await AsyncTaskRepository.findById(taskId);
    if (!task) throw new Error('任务不存在');

    if (task.status !== TaskStatus.WAITING_MANUAL && 
        task.status !== TaskStatus.PERMANENT_FAILED) {
      throw new Error('只有等待人工或永久失败的任务才能手动重试');
    }

    await AsyncTaskRepository.update(taskId, {
      status: TaskStatus.PENDING,
      retryCount: 0,
      errorMessage: null as any,
      errorStack: null as any,
      nextRunAt: null as any
    });

    logger.info(`任务已标记为重试: ${taskId}`);
    return AsyncTaskRepository.findById(taskId) as Promise<AsyncTask>;
  }

  static async markAsManual(taskId: string, reason: string): Promise<AsyncTask> {
    const task = await AsyncTaskRepository.findById(taskId);
    if (!task) throw new Error('任务不存在');

    await AsyncTaskRepository.update(taskId, {
      status: TaskStatus.WAITING_MANUAL,
      errorMessage: reason
    });

    logger.info(`任务已标记为等待人工处理: ${taskId}, 原因: ${reason}`);
    return AsyncTaskRepository.findById(taskId) as Promise<AsyncTask>;
  }

  static async getTasksByStatus(status: TaskStatus): Promise<AsyncTask[]> {
    return AsyncTaskRepository.findByStatus(status);
  }

  static async getTaskById(taskId: string): Promise<AsyncTask | null> {
    return AsyncTaskRepository.findById(taskId);
  }
}

export function registerDefaultHandlers(): void {
  AsyncTaskService.registerHandler('batch_process', async (payload) => {
    const { data, strategy, userId, userRole } = payload as {
      data: any;
      strategy: BatchStrategy;
      userId: string;
      userRole: Role;
    };
    
    await LedgerService.processBatch(data, userId, userRole, strategy);
  });
}

export function startTaskScheduler(): void {
  const cron = require('node-cron');
  
  cron.schedule(config.asyncTask.cronSchedule, async () => {
    logger.debug('开始执行定时任务处理...');
    try {
      await AsyncTaskService.processPendingTasks();
    } catch (error) {
      logger.error('定时任务处理失败:', error);
    }
  });

  logger.info('任务调度器已启动');
}
