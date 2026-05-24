import { CronJob } from 'cron';
import { config } from '../config';
import logger from '../utils/logger';
import { retryQueueService } from './RetryQueueService';

class QueueWorker {
  private job: CronJob | null = null;
  private isRunning: boolean = false;

  start(): void {
    if (this.job) {
      logger.warn('队列工作器已在运行');
      return;
    }

    const cronExpression = `*/${config.queue.workerIntervalSeconds} * * * * *`;
    
    this.job = new CronJob(
      cronExpression,
      async () => {
        if (this.isRunning) {
          logger.debug('跳过执行，上一批次仍在处理中');
          return;
        }

        this.isRunning = true;
        try {
          const result = await retryQueueService.processPendingItems();
          if (result.processed > 0) {
            logger.info(`队列处理完成: 处理 ${result.processed} 条, 成功 ${result.success} 条, 失败 ${result.failed} 条`);
          }
        } catch (error) {
          logger.error('队列处理异常:', error);
        } finally {
          this.isRunning = false;
        }
      },
      null,
      true,
      'Asia/Shanghai'
    );

    logger.info(`队列工作器已启动，每 ${config.queue.workerIntervalSeconds} 秒执行一次`);
  }

  stop(): void {
    if (this.job) {
      this.job.stop();
      this.job = null;
      logger.info('队列工作器已停止');
    }
  }

  triggerManually(): Promise<{ processed: number; success: number; failed: number }> {
    logger.info('手动触发队列处理');
    return retryQueueService.processPendingItems();
  }
}

export const queueWorker = new QueueWorker();
