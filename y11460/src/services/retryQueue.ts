import { EventEmitter } from 'events'

export interface RetryTask {
  id: string
  action: string
  receiptId: string
  operatorId: string
  data: any
  retryCount: number
  maxRetries: number
  lastError?: string
  createdAt: Date
  nextRetryAt?: Date
}

export class RetryQueueService extends EventEmitter {
  private queue: Map<string, RetryTask> = new Map()
  private readonly DEFAULT_MAX_RETRIES = 3
  private readonly DEFAULT_RETRY_DELAY = 5000

  addTask(
    action: string,
    receiptId: string,
    operatorId: string,
    data: any,
    maxRetries: number = this.DEFAULT_MAX_RETRIES
  ): RetryTask {
    const taskId = `${receiptId}-${action}-${Date.now()}`
    const task: RetryTask = {
      id: taskId,
      action,
      receiptId,
      operatorId,
      data,
      retryCount: 0,
      maxRetries,
      createdAt: new Date()
    }

    this.queue.set(taskId, task)
    this.emit('task:added', task)
    this.scheduleRetry(taskId)

    return task
  }

  private scheduleRetry(taskId: string): void {
    const task = this.queue.get(taskId)
    if (!task) return

    const delay = this.DEFAULT_RETRY_DELAY * Math.pow(2, task.retryCount)
    task.nextRetryAt = new Date(Date.now() + delay)

    setTimeout(() => {
      this.processTask(taskId)
    }, delay)
  }

  private async processTask(taskId: string): Promise<void> {
    const task = this.queue.get(taskId)
    if (!task) return

    this.emit('task:retry', task)
  }

  markSuccess(taskId: string): void {
    const task = this.queue.get(taskId)
    if (!task) return

    this.emit('task:success', task)
    this.queue.delete(taskId)
  }

  markFailed(taskId: string, error: string): boolean {
    const task = this.queue.get(taskId)
    if (!task) return false

    task.retryCount++
    task.lastError = error

    if (task.retryCount >= task.maxRetries) {
      this.emit('task:failed', task)
      this.queue.delete(taskId)
      return false
    }

    this.scheduleRetry(taskId)
    return true
  }

  getTask(taskId: string): RetryTask | undefined {
    return this.queue.get(taskId)
  }

  getTasksByReceipt(receiptId: string): RetryTask[] {
    return Array.from(this.queue.values()).filter(t => t.receiptId === receiptId)
  }

  getAllTasks(): RetryTask[] {
    return Array.from(this.queue.values())
  }

  cancelTask(taskId: string): boolean {
    const task = this.queue.get(taskId)
    if (!task) return false

    this.emit('task:cancelled', task)
    return this.queue.delete(taskId)
  }

  getPendingCount(): number {
    return this.queue.size
  }
}

export const retryQueue = new RetryQueueService()
