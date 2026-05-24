import taskRepository from '../repositories/TaskRepository';
import type { Task, TaskStatus } from '../../shared/types';

type TaskHandler = (payload: Record<string, any>) => Promise<void>;

class TaskQueueService {
  private handlers: Map<string, TaskHandler> = new Map();
  private isRunning = false;
  private pollInterval: NodeJS.Timeout | null = null;

  registerHandler(taskType: string, handler: TaskHandler): void {
    this.handlers.set(taskType, handler);
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    this.pollInterval = setInterval(() => {
      this.processPendingRetry();
    }, 5000);

    await this.processPending();
  }

  stop(): void {
    this.isRunning = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  createTask(params: {
    batchId?: string;
    documentId?: string;
    type: string;
    payload: Record<string, any>;
    maxRetries?: number;
  }): Task {
    return taskRepository.create(params);
  }

  private async processPending(): Promise<void> {
    const { data: tasks } = taskRepository.findAll({ status: 'PENDING' });
    
    for (const task of tasks) {
      await this.processTask(task);
    }
  }

  private async processPendingRetry(): Promise<void> {
    const tasks = taskRepository.findPendingRetry();
    
    for (const task of tasks) {
      await this.processTask(task);
    }
  }

  private async processTask(task: Task): Promise<void> {
    const handler = this.handlers.get(task.type);
    if (!handler) {
      this.updateStatus(task.id, 'WAITING_MANUAL', `No handler found for type: ${task.type}`, 'NO_HANDLER');
      return;
    }

    try {
      taskRepository.updateStatus(task.id, 'PROCESSING');
      await handler(task.payload);
      taskRepository.updateStatus(task.id, 'SUCCESS');
    } catch (error: any) {
      await this.handleTaskError(task, error);
    }
  }

  private async handleTaskError(task: Task, error: Error): Promise<void> {
    const errorMessage = error.message || 'Unknown error';
    const errorType = this.classifyError(error);

    if (errorType === 'MANUAL_REQUIRED') {
      taskRepository.updateStatus(task.id, 'WAITING_MANUAL', errorMessage, errorType);
      return;
    }

    if (task.retryCount >= task.maxRetries) {
      if (errorType === 'RECOVERABLE') {
        taskRepository.updateStatus(task.id, 'WAITING_MANUAL', errorMessage, errorType);
      } else {
        taskRepository.updateStatus(task.id, 'PERMANENT_FAILED', errorMessage, errorType);
      }
      return;
    }

    if (errorType === 'RECOVERABLE') {
      const nextRetryAt = new Date(Date.now() + 60000 * (task.retryCount + 1)).toISOString();
      taskRepository.updateStatus(task.id, 'WAITING_RETRY', errorMessage, errorType);
      taskRepository.incrementRetry(task.id, nextRetryAt);
    } else {
      taskRepository.updateStatus(task.id, 'PERMANENT_FAILED', errorMessage, errorType);
    }
  }

  private classifyError(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
      return 'RECOVERABLE';
    }
    if (message.includes('validation') || message.includes('invalid') || message.includes('bad data')) {
      return 'MANUAL_REQUIRED';
    }
    return 'PERMANENT';
  }

  private updateStatus(id: string, status: TaskStatus, errorMessage: string, errorType: string): void {
    taskRepository.updateStatus(id, status, errorMessage, errorType);
  }
}

export default new TaskQueueService();
