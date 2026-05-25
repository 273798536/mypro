import Bull, { Job, Queue } from 'bull';
import { config } from '../config';
import getRedisClient from '../config/redis';
import logger from '../config/logger';
import {
  CompensationTicketModel,
  StatusHistoryModel,
  RetryRecordModel,
  DeadLetterModel,
  AuditLogModel,
} from '../models';
import {
  TicketStatus,
  RetryCategory,
  QueueMessage,
  Operator,
} from '../types';

export interface CompensationJobData {
  ticketId: string;
  batchId: string;
  ticketNo: string;
  retryCount: number;
  category: RetryCategory;
  operator: Operator;
}

let compensationQueue: Queue<CompensationJobData> | null = null;
let deadLetterQueue: Queue<CompensationJobData> | null = null;

export const getCompensationQueue = (): Queue<CompensationJobData> => {
  if (!compensationQueue) {
    const redisClient = getRedisClient();
    compensationQueue = new Bull<CompensationJobData>(
      'compensation-processing',
      {
        redis: {
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password || undefined,
          db: config.redis.db,
        },
        defaultJobOptions: {
          attempts: config.queue.retryAttempts,
          backoff: {
            type: 'exponential',
            delay: config.queue.retryDelay,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      }
    );

    setupQueueProcessors();
    logger.info('Compensation queue initialized');
  }

  return compensationQueue;
};

export const getDeadLetterQueue = (): Queue<CompensationJobData> => {
  if (!deadLetterQueue) {
    deadLetterQueue = new Bull<CompensationJobData>('compensation-dead-letter', {
      redis: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password || undefined,
        db: config.redis.db,
      },
    });
    logger.info('Dead letter queue initialized');
  }

  return deadLetterQueue;
};

const setupQueueProcessors = (): void => {
  const queue = getCompensationQueue();

  queue.process(
    config.queue.concurrency,
    async (job: Job<CompensationJobData>) => {
      const { ticketId, retryCount, category, operator } = job.data;

      logger.info(`Processing ticket ${ticketId}, attempt ${retryCount + 1}`, {
        ticketId,
        attempt: retryCount + 1,
      });

      try {
        const ticket = await CompensationTicketModel.findByPk(ticketId);
        if (!ticket) {
          throw new Error(`Ticket ${ticketId} not found`);
        }

        if (ticket.isFrozen) {
          throw new Error(`Ticket ${ticketId} is frozen`);
        }

        if (ticket.status === TicketStatus.WITHDRAWN) {
          throw new Error(`Ticket ${ticketId} has been withdrawn`);
        }

        await ticket.update({
          status: TicketStatus.PROCESSING,
          retryCount: retryCount + 1,
          lastRetryAt: new Date(),
        });

        await StatusHistoryModel.create({
          ticketId,
          fromStatus: ticket.status,
          toStatus: TicketStatus.PROCESSING,
          operator,
          reason: `开始补偿处理，第 ${retryCount + 1} 次尝试`,
          metadata: { category, attempt: retryCount + 1 },
        });

        const result = await executeCompensationLogic(ticket);

        if (result.success) {
          await ticket.update({
            status: TicketStatus.COMPENSATED,
            compensatedAt: new Date(),
          });

          await StatusHistoryModel.create({
            ticketId,
            fromStatus: TicketStatus.PROCESSING,
            toStatus: TicketStatus.COMPENSATED,
            operator,
            reason: '补偿处理成功',
            metadata: result.data,
          });

          await RetryRecordModel.create({
            ticketId,
            attempt: retryCount + 1,
            category,
            errorMessage: '',
            executedBy: operator.id,
            success: true,
            responseData: result.data,
          });

          await AuditLogModel.create({
            ticketId,
            action: 'COMPENSATE_SUCCESS',
            operator,
            metadata: { attempt: retryCount + 1 },
          });

          logger.info(`Ticket ${ticketId} compensated successfully`);
          return { success: true, ticketId };
        } else {
          throw new Error(result.error || 'Compensation failed');
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;

        logger.error(
          `Failed to process ticket ${ticketId}, attempt ${retryCount + 1}:`,
          error
        );

        await RetryRecordModel.create({
          ticketId,
          attempt: retryCount + 1,
          category,
          errorMessage,
          errorStack,
          executedBy: operator.id,
          success: false,
        });

        const ticket = await CompensationTicketModel.findByPk(ticketId);
        if (ticket) {
          if (retryCount + 1 >= ticket.maxRetries) {
            await moveToDeadLetter(ticket, category, errorMessage, operator);
          } else {
            await ticket.update({
              status: TicketStatus.RETRYING,
              retryCategory: category,
              nextRetryAt: new Date(
                Date.now() + config.queue.retryDelay * Math.pow(2, retryCount)
              ),
            });

            await StatusHistoryModel.create({
              ticketId,
              fromStatus: TicketStatus.PROCESSING,
              toStatus: TicketStatus.RETRYING,
              operator,
              reason: `处理失败，准备第 ${retryCount + 2} 次重试: ${errorMessage}`,
              metadata: { error: errorMessage, nextAttempt: retryCount + 2 },
            });
          }
        }

        throw error;
      }
    }
  );

  queue.on('failed', async (job: Job<CompensationJobData>, err: Error) => {
    logger.error(`Job failed: ${job.id}`, err);
  });

  queue.on('completed', (job: Job<CompensationJobData>) => {
    logger.info(`Job completed: ${job.id}`);
  });
};

const failureCounter: Record<string, number> = {};

const executeCompensationLogic = async (
  ticket: CompensationTicketModel
): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> => {
  try {
    const { data, id, retryCount } = ticket;
    const amounts = data.compensationAmounts;
    const totalAmount = amounts.reduce((sum, a) => sum + a.amount, 0);

    await new Promise((resolve) => setTimeout(resolve, 500));

    if (config.queue.simulateFailure) {
      const currentFailures = failureCounter[id] || 0;
      const maxFailures = config.queue.simulateFailureCount;

      if (currentFailures < maxFailures) {
        failureCounter[id] = currentFailures + 1;

        const errorTypes = [
          { error: '外部支付系统连接超时', category: RetryCategory.NETWORK_ERROR },
          { error: '数据库事务死锁，需重试', category: RetryCategory.SYSTEM_ERROR },
          { error: '第三方接口限流，请稍后重试', category: RetryCategory.NETWORK_ERROR },
        ];
        const errorInfo = errorTypes[currentFailures % errorTypes.length];

        logger.warn(`[模拟失败] 工单 ${id} 第 ${currentFailures + 1}/${maxFailures} 次失败: ${errorInfo.error}`, {
          ticketId: id,
          retryCount,
          simulated: true,
        });

        return {
          success: false,
          error: errorInfo.error,
        };
      }

      delete failureCounter[id];
      logger.info(`[模拟成功] 工单 ${id} 第 ${retryCount + 1} 次尝试成功，结束模拟失败`, {
        ticketId: id,
        totalFailures: maxFailures,
      });
    }

    return {
      success: true,
      data: {
        transactionId: `TXN-${Date.now()}`,
        totalAmount,
        processedAt: new Date().toISOString(),
        details: amounts.map((a) => ({
          type: a.type,
          amount: a.amount,
          status: 'success',
        })),
      },
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Compensation execution failed',
    };
  }
};

const moveToDeadLetter = async (
  ticket: CompensationTicketModel,
  category: RetryCategory,
  errorMessage: string,
  operator: Operator
): Promise<void> => {
  const ticketId = ticket.id;
  const batchId = ticket.batchId;

  await CompensationTicketModel.update(
    {
      status: TicketStatus.DEAD_LETTER,
      retryCategory: category,
    },
    { where: { id: ticketId } }
  );

  await StatusHistoryModel.create({
    ticketId,
    fromStatus: TicketStatus.PROCESSING,
    toStatus: TicketStatus.DEAD_LETTER,
    operator,
    reason: `重试次数耗尽，进入死信队列: ${errorMessage}`,
    metadata: { error: errorMessage, category },
  });

  const canBeRecovered = category !== RetryCategory.BUSINESS_ERROR;
  await DeadLetterModel.create({
    ticketId,
    batchId,
    lastError: errorMessage,
    retryCount: ticket.retryCount,
    retryCategory: category,
    canBeRecovered,
    recoverySuggestion: canBeRecovered
      ? getRecoverySuggestion(category)
      : '业务错误，无法自动恢复，请人工核实',
    originalMessage: ticket.data as unknown as Record<string, unknown>,
  });

  await AuditLogModel.create({
    ticketId,
    action: 'MOVE_TO_DEAD_LETTER',
    operator,
    metadata: { error: errorMessage, category },
  });

  logger.warn(`Ticket ${ticketId} moved to dead letter queue`, {
    ticketId,
    category,
    error: errorMessage,
  });
};

const getRecoverySuggestion = (category: RetryCategory): string => {
  switch (category) {
    case RetryCategory.SYSTEM_ERROR:
      return '系统错误，请检查系统状态后手动恢复重试';
    case RetryCategory.NETWORK_ERROR:
      return '网络错误，建议稍后恢复重试';
    case RetryCategory.DATA_ERROR:
      return '数据格式错误，请核实并修正数据后恢复重试';
    case RetryCategory.MANUAL_RETRY:
      return '手动触发重试，请确认后继续';
    default:
      return '请联系技术支持进行排查';
  }
};

export const enqueueCompensation = async (
  jobData: CompensationJobData,
  delay?: number
): Promise<Job<CompensationJobData>> => {
  const queue = getCompensationQueue();
  const options: Bull.JobOptions = delay ? { delay } : {};
  const job = await queue.add(jobData, options);

  logger.info(`Enqueued compensation job for ticket ${jobData.ticketId}`, {
    jobId: job.id,
    ticketId: jobData.ticketId,
    delay: delay || 0,
  });

  return job;
};

export const recoverFromDeadLetter = async (
  deadLetterId: string,
  operator: Operator,
  notes?: string
): Promise<boolean> => {
  const deadLetter = await DeadLetterModel.findByPk(deadLetterId);
  if (!deadLetter || deadLetter.isRecovered) {
    return false;
  }

  const ticket = await CompensationTicketModel.findByPk(deadLetter.ticketId);
  if (!ticket) {
    return false;
  }

  const newRetryCount = ticket.retryCount + 3;
  await ticket.update({
    status: TicketStatus.RETRYING,
    retryCount: 0,
    maxRetries: newRetryCount,
    retryCategory: RetryCategory.MANUAL_RETRY,
  });

  await deadLetter.update({
    isRecovered: true,
    recoveredAt: new Date(),
    recoveredBy: operator,
    recoveryNotes: notes,
  });

  await StatusHistoryModel.create({
    ticketId: ticket.id,
    fromStatus: TicketStatus.DEAD_LETTER,
    toStatus: TicketStatus.RETRYING,
    operator,
    reason: `从死信队列恢复，备注: ${notes || '无'}`,
  });

  await AuditLogModel.create({
    ticketId: ticket.id,
    action: 'RECOVER_FROM_DEAD_LETTER',
    operator,
    metadata: { deadLetterId, notes },
  });

  await enqueueCompensation({
    ticketId: ticket.id,
    batchId: ticket.batchId,
    ticketNo: ticket.ticketNo,
    retryCount: 0,
    category: RetryCategory.MANUAL_RETRY,
    operator,
  });

  logger.info(`Ticket ${ticket.id} recovered from dead letter queue`, {
    deadLetterId,
    operator: operator.id,
  });

  return true;
};

export const closeQueues = async (): Promise<void> => {
  if (compensationQueue) {
    await compensationQueue.close();
    compensationQueue = null;
  }
  if (deadLetterQueue) {
    await deadLetterQueue.close();
    deadLetterQueue = null;
  }
  logger.info('All queues closed');
};
