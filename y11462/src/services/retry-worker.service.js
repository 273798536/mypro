const QueueService = require('./queue.service');
const { QUEUE_STATUS } = require('../constants/status');

class RetryWorker {
  constructor(options = {}) {
    this.interval = options.interval || 30000;
    this.isRunning = false;
    this.timer = null;
    this.processingIds = new Set();
  }

  async processItem(queueItem) {
    if (this.processingIds.has(queueItem.id)) {
      return;
    }

    this.processingIds.add(queueItem.id);
    console.log(`[RetryWorker] 开始处理队列项: ${queueItem.queue_no}`);

    try {
      await QueueService.updateStatus(queueItem.id, QUEUE_STATUS.PROCESSING, {
        remark: '重试处理中'
      });

      const success = await this.executeBusinessLogic(queueItem);

      if (success) {
        console.log(`[RetryWorker] 队列项 ${queueItem.queue_no} 处理成功`);
      } else {
        await QueueService.markForRetry(queueItem.id, '业务逻辑处理失败', {
          retryDelayMinutes: 5
        });
        console.log(`[RetryWorker] 队列项 ${queueItem.queue_no} 处理失败，安排重试`);
      }
    } catch (error) {
      console.error(`[RetryWorker] 处理队列项 ${queueItem.queue_no} 异常:`, error.message);
      await QueueService.markForRetry(queueItem.id, error.message, {
        retryDelayMinutes: 5
      });
    } finally {
      this.processingIds.delete(queueItem.id);
    }
  }

  async executeBusinessLogic(queueItem) {
    console.log(`[RetryWorker] 执行业务逻辑: ${queueItem.queue_no}`);
    return new Promise((resolve) => {
      setTimeout(() => {
        const shouldSucceed = Math.random() > 0.3;
        resolve(shouldSucceed);
      }, 1000);
    });
  }

  async processBatch() {
    try {
      const items = await QueueService.getRetryableItems();
      console.log(`[RetryWorker] 发现 ${items.length} 个可重试项`);

      for (const item of items) {
        this.processItem(item);
      }
    } catch (error) {
      console.error('[RetryWorker] 批量处理异常:', error.message);
    }
  }

  start() {
    if (this.isRunning) {
      console.log('[RetryWorker] 重试工作器已在运行');
      return;
    }

    this.isRunning = true;
    console.log(`[RetryWorker] 启动重试工作器，间隔 ${this.interval / 1000} 秒`);

    this.processBatch();
    this.timer = setInterval(() => {
      if (this.isRunning) {
        this.processBatch();
      }
    }, this.interval);
  }

  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('[RetryWorker] 重试工作器已停止');
  }

  trigger() {
    console.log('[RetryWorker] 手动触发重试处理');
    this.processBatch();
  }
}

module.exports = RetryWorker;
