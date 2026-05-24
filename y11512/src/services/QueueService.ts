import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../config/database';
import { 
  RetryQueue, 
  QueueStatus, 
  RetryCategory, 
  PayloadType 
} from '../entities/RetryQueue';
import { 
  DeadLetter, 
  DeadLetterReason, 
  DeadLetterStatus 
} from '../entities/DeadLetter';
import { AuditLogService } from './AuditLogService';
import { OperationType, EntityType } from '../entities/OperationLog';
import { In, LessThanOrEqual, IsNull } from 'typeorm';

export interface EnqueueOptions {
  applicationId: string;
  payloadType: PayloadType;
  payload: any;
  maxRetryCount?: number;
  retryIntervalSeconds?: number;
  batchId?: string;
  externalReference?: string;
  operatorId?: string;
  operatorName?: string;
}

export interface ProcessResult {
  success: boolean;
  taskId: string;
  error?: string;
  errorDetails?: any;
}

export class QueueService {
  private static retryRepository = AppDataSource.getRepository(RetryQueue);
  private static deadLetterRepository = AppDataSource.getRepository(DeadLetter);

  static async enqueue(options: EnqueueOptions): Promise<RetryQueue> {
    const existingTask = await this.retryRepository.findOne({
      where: {
        applicationId: options.applicationId,
        payloadType: options.payloadType,
        status: In([QueueStatus.PENDING, QueueStatus.PROCESSING])
      }
    });

    if (existingTask) {
      existingTask.payload = { ...existingTask.payload, ...options.payload };
      existingTask.updatedBy = options.operatorId;
      existingTask.batchId = options.batchId || existingTask.batchId;
      await this.retryRepository.save(existingTask);
      
      await AuditLogService.log(
        OperationType.UPDATE,
        EntityType.RETRY_QUEUE,
        existingTask.id,
        {
          entityNo: existingTask.taskId,
          afterData: existingTask,
          operatorId: options.operatorId,
          operatorName: options.operatorName,
          remark: '更新队列任务（合并提交）',
          batchId: options.batchId
        }
      );
      
      return existingTask;
    }

    const task = this.retryRepository.create({
      taskId: uuidv4(),
      applicationId: options.applicationId,
      payloadType: options.payloadType,
      payload: options.payload,
      status: QueueStatus.PENDING,
      maxRetryCount: options.maxRetryCount || 3,
      retryIntervalSeconds: options.retryIntervalSeconds || 60,
      batchId: options.batchId,
      externalReference: options.externalReference,
      createdBy: options.operatorId,
      nextRetryTime: new Date()
    });

    const savedTask = await this.retryRepository.save(task);

    await AuditLogService.log(
      OperationType.CREATE,
      EntityType.RETRY_QUEUE,
      savedTask.id,
      {
        entityNo: savedTask.taskId,
        afterData: savedTask,
        operatorId: options.operatorId,
        operatorName: options.operatorName,
        remark: '创建队列任务',
        batchId: options.batchId
      }
    );

    return savedTask;
  }

  static async getPendingTasks(limit: number = 10): Promise<RetryQueue[]> {
    const now = new Date();
    return await this.retryRepository.find({
      where: {
        status: QueueStatus.PENDING,
        isFrozen: false,
        nextRetryTime: LessThanOrEqual(now)
      },
      order: { createdAt: 'ASC' },
      take: limit
    });
  }

  static async classifyError(error: Error): Promise<RetryCategory> {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('timeout') || message.includes('econnrefused')) {
      return RetryCategory.NETWORK_ERROR;
    }
    if (message.includes('api') || message.includes('external') || message.includes('500')) {
      return RetryCategory.EXTERNAL_API_ERROR;
    }
    if (message.includes('validation') || message.includes('invalid') || message.includes('400')) {
      return RetryCategory.DATA_VALIDATION_ERROR;
    }
    if (message.includes('business') || message.includes('rule') || message.includes('422')) {
      return RetryCategory.BUSINESS_RULE_ERROR;
    }
    if (message.includes('system') || message.includes('database') || message.includes('503')) {
      return RetryCategory.SYSTEM_ERROR;
    }
    return RetryCategory.UNKNOWN_ERROR;
  }

  static async processTask(
    taskId: string,
    processor: (payload: any) => Promise<void>,
    operatorId?: string
  ): Promise<ProcessResult> {
    const task = await this.retryRepository.findOne({ where: { taskId } });
    if (!task) {
      return { success: false, taskId, error: 'Task not found' };
    }

    if (task.status === QueueStatus.SUCCESS || task.status === QueueStatus.CANCELLED) {
      return { success: true, taskId };
    }

    if (task.isFrozen) {
      return { success: false, taskId, error: 'Task is frozen' };
    }

    const beforeData = { ...task };
    task.status = QueueStatus.PROCESSING;
    task.retryCount += 1;
    task.lastProcessedAt = new Date();
    await this.retryRepository.save(task);

    try {
      await processor(task.payload);
      
      task.status = QueueStatus.SUCCESS;
      task.lastError = undefined;
      task.errorDetails = undefined;
      await this.retryRepository.save(task);

      await AuditLogService.log(
        OperationType.STATUS_CHANGE,
        EntityType.RETRY_QUEUE,
        task.id,
        {
          entityNo: task.taskId,
          beforeData,
          afterData: task,
          changes: { status: QueueStatus.SUCCESS },
          operatorId,
          remark: '任务处理成功'
        }
      );

      return { success: true, taskId };
    } catch (error: any) {
      task.status = QueueStatus.FAILED;
      task.lastError = error.message;
      task.errorDetails = { stack: error.stack };
      task.retryCategory = await this.classifyError(error);

      if (task.retryCount >= task.maxRetryCount) {
        await this.moveToDeadLetter(task, DeadLetterReason.MAX_RETRY_EXCEEDED, operatorId);
      } else {
        task.nextRetryTime = new Date(Date.now() + task.retryIntervalSeconds * 1000 * task.retryCount);
        task.status = QueueStatus.PENDING;
        await this.retryRepository.save(task);
      }

      await AuditLogService.log(
        OperationType.STATUS_CHANGE,
        EntityType.RETRY_QUEUE,
        task.id,
        {
          entityNo: task.taskId,
          beforeData,
          afterData: task,
          changes: { status: task.status, error: error.message },
          operatorId,
          remark: `任务处理失败: ${error.message}`
        }
      );

      return { 
        success: false, 
        taskId, 
        error: error.message,
        errorDetails: { stack: error.stack }
      };
    }
  }

  static async moveToDeadLetter(
    task: RetryQueue,
    reason: DeadLetterReason,
    operatorId?: string,
    note?: string
  ): Promise<DeadLetter> {
    const deadLetter = this.deadLetterRepository.create({
      deadLetterId: uuidv4(),
      originalTaskId: task.taskId,
      applicationId: task.applicationId,
      payloadType: task.payloadType,
      payload: task.payload,
      reason,
      retryCategory: task.retryCategory,
      status: DeadLetterStatus.OPEN,
      lastError: task.lastError,
      errorDetails: task.errorDetails,
      retryCount: task.retryCount,
      resolvedBy: operatorId,
      resolutionNote: note
    });

    const saved = await this.deadLetterRepository.save(deadLetter);

    task.status = QueueStatus.FAILED;
    await this.retryRepository.save(task);

    await AuditLogService.log(
      OperationType.CREATE,
      EntityType.DEAD_LETTER,
      saved.id,
      {
        entityNo: saved.deadLetterId,
        afterData: saved,
        operatorId,
        remark: `移入死信队列，原因: ${reason}`
      }
    );

    return saved;
  }

  static async requeueFromDeadLetter(
    deadLetterId: string,
    operatorId: string,
    operatorName: string,
    note?: string
  ): Promise<RetryQueue> {
    const deadLetter = await this.deadLetterRepository.findOne({ where: { deadLetterId } });
    if (!deadLetter) {
      throw new Error('Dead letter not found');
    }

    const task = await this.enqueue({
      applicationId: deadLetter.applicationId,
      payloadType: deadLetter.payloadType,
      payload: deadLetter.payload,
      maxRetryCount: 3,
      operatorId,
      operatorName
    });

    deadLetter.status = DeadLetterStatus.REQUEUED;
    deadLetter.requeuedTaskId = task.taskId;
    deadLetter.resolvedBy = operatorId;
    deadLetter.resolvedAt = new Date();
    deadLetter.resolutionNote = note;
    await this.deadLetterRepository.save(deadLetter);

    await AuditLogService.log(
      OperationType.STATUS_CHANGE,
      EntityType.DEAD_LETTER,
      deadLetter.id,
      {
        entityNo: deadLetter.deadLetterId,
        changes: { status: DeadLetterStatus.REQUEUED, requeuedTaskId: task.taskId },
        operatorId,
        operatorName,
        remark: '死信重新入队'
      }
    );

    return task;
  }

  static async freezeTask(
    taskId: string,
    operatorId: string,
    operatorName: string,
    reason: string
  ): Promise<RetryQueue> {
    const task = await this.retryRepository.findOne({ where: { taskId } });
    if (!task) {
      throw new Error('Task not found');
    }

    const beforeData = { ...task };
    task.isFrozen = true;
    task.frozenBy = operatorId;
    task.frozenAt = new Date();
    task.frozenReason = reason;
    await this.retryRepository.save(task);

    await AuditLogService.log(
      OperationType.FREEZE,
      EntityType.RETRY_QUEUE,
      task.id,
      {
        entityNo: task.taskId,
        beforeData,
        afterData: task,
        operatorId,
        operatorName,
        remark: `冻结任务: ${reason}`
      }
    );

    return task;
  }

  static async unfreezeTask(
    taskId: string,
    operatorId: string,
    operatorName: string
  ): Promise<RetryQueue> {
    const task = await this.retryRepository.findOne({ where: { taskId } });
    if (!task) {
      throw new Error('Task not found');
    }

    const beforeData = { ...task };
    task.isFrozen = false;
    task.nextRetryTime = new Date();
    await this.retryRepository.save(task);

    await AuditLogService.log(
      OperationType.UNFREEZE,
      EntityType.RETRY_QUEUE,
      task.id,
      {
        entityNo: task.taskId,
        beforeData,
        afterData: task,
        operatorId,
        operatorName,
        remark: '解冻任务'
      }
    );

    return task;
  }

  static async manualOverride(
    taskId: string,
    operatorId: string,
    operatorName: string,
    note: string,
    markAsSuccess: boolean = false
  ): Promise<RetryQueue> {
    const task = await this.retryRepository.findOne({ where: { taskId } });
    if (!task) {
      throw new Error('Task not found');
    }

    const beforeData = { ...task };
    task.status = markAsSuccess ? QueueStatus.SUCCESS : QueueStatus.MANUAL;
    task.manualOperator = operatorId;
    task.manualOperatedAt = new Date();
    task.manualNote = note;
    await this.retryRepository.save(task);

    await AuditLogService.log(
      OperationType.MANUAL_DECISION,
      EntityType.RETRY_QUEUE,
      task.id,
      {
        entityNo: task.taskId,
        beforeData,
        afterData: task,
        operatorId,
        operatorName,
        remark: `人工干预: ${note}`
      }
    );

    return task;
  }

  static async getTaskStats() {
    const [pending, processing, success, failed, manual, frozen] = await Promise.all([
      this.retryRepository.count({ where: { status: QueueStatus.PENDING, isFrozen: false } }),
      this.retryRepository.count({ where: { status: QueueStatus.PROCESSING } }),
      this.retryRepository.count({ where: { status: QueueStatus.SUCCESS } }),
      this.retryRepository.count({ where: { status: QueueStatus.FAILED } }),
      this.retryRepository.count({ where: { status: QueueStatus.MANUAL } }),
      this.retryRepository.count({ where: { isFrozen: true } })
    ]);

    const deadLetterStats = await this.deadLetterRepository
      .createQueryBuilder('dl')
      .select('dl.retryCategory, COUNT(*) as count')
      .where('dl.status = :status', { status: DeadLetterStatus.OPEN })
      .groupBy('dl.retryCategory')
      .getRawMany();

    return {
      queue: { pending, processing, success, failed, manual, frozen },
      deadLetter: {
        total: await this.deadLetterRepository.count({ where: { status: DeadLetterStatus.OPEN } }),
        byCategory: deadLetterStats
      }
    };
  }
}
