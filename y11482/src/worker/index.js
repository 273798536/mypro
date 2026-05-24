const CompensationQueueService = require('../services/compensationQueueService');
const { QUEUE_STATUS, ERROR_CODES } = require('../constants');

const POLL_INTERVAL = 5000;
const BATCH_SIZE = 10;
const MAX_CONCURRENT = 5;

let isRunning = false;
let activeTasks = 0;

class QueueWorker {
  constructor() {
    this.timer = null;
    this.isShuttingDown = false;
  }

  async processItem(item) {
    console.log(`[Worker] 开始处理队列项: ${item.id}`);
    
    try {
      await CompensationQueueService.startProcessing(item.id);

      const result = await this.executeTask(item);

      await CompensationQueueService.markSuccess(
        item.id,
        { success: true, result, processedAt: new Date().toISOString() },
        null,
        'worker'
      );

      console.log(`[Worker] 处理成功: ${item.id}`);
    } catch (error) {
      console.error(`[Worker] 处理失败: ${item.id}`, error.message);
      
      const isRetryable = this.isRetryableError(error);
      
      if (isRetryable) {
        await CompensationQueueService.markRetry(
          item.id,
          error.message,
          error.code || ERROR_CODES.UNKNOWN_ERROR,
          null,
          'worker'
        );
      } else {
        await CompensationQueueService.markPermanentFailed(
          item.id,
          error.message,
          error.code || ERROR_CODES.UNKNOWN_ERROR,
          null,
          'worker'
        );
      }
    }
  }

  async executeTask(item) {
    console.log(`[Worker] 执行任务逻辑: ${item.action_type}`);
    
    switch (item.action_type) {
      case 'receipt_submit':
        return await this.processReceiptSubmit(item);
      case 'retry':
        return await this.processRetry(item);
      default:
        return { action: item.action_type, status: 'completed' };
    }
  }

  async processReceiptSubmit(item) {
    if (Math.random() < 0.3) {
      const error = new Error('模拟外部系统调用失败');
      error.code = ERROR_CODES.EXTERNAL_SYSTEM_ERROR;
      throw error;
    }
    
    return {
      receiptId: `RCPT-${Date.now()}`,
      confirmed: true,
      confirmedAt: new Date().toISOString()
    };
  }

  async processRetry(item) {
    return {
      retryCount: item.retry_count + 1,
      success: true
    };
  }

  isRetryableError(error) {
    const retryableCodes = [
      ERROR_CODES.NETWORK_ERROR,
      ERROR_CODES.EXTERNAL_SYSTEM_ERROR,
      ERROR_CODES.UNKNOWN_ERROR
    ];
    return retryableCodes.includes(error.code);
  }

  async poll() {
    if (this.isShuttingDown) return;
    if (activeTasks >= MAX_CONCURRENT) return;

    try {
      const items = await CompensationQueueService.getRetryableItems(BATCH_SIZE - activeTasks);
      
      if (items.length > 0) {
        console.log(`[Worker] 获取到 ${items.length} 个待处理任务`);
      }

      for (const item of items) {
        if (activeTasks >= MAX_CONCURRENT) break;
        if (this.isShuttingDown) break;

        activeTasks++;
        this.processItem(item).finally(() => {
          activeTasks--;
        });
      }

      const pendingItems = await CompensationQueueService.getPendingItems(BATCH_SIZE - activeTasks);
      
      for (const item of pendingItems) {
        if (activeTasks >= MAX_CONCURRENT) break;
        if (this.isShuttingDown) break;

        activeTasks++;
        this.processItem(item).finally(() => {
          activeTasks--;
        });
      }
    } catch (error) {
      console.error('[Worker] 轮询出错:', error.message);
    }
  }

  start() {
    if (isRunning) {
      console.log('[Worker] Worker 已在运行中');
      return;
    }

    isRunning = true;
    console.log('[Worker] 启动补偿队列 Worker...');
    console.log(`[Worker] 轮询间隔: ${POLL_INTERVAL}ms`);
    console.log(`[Worker] 批量大小: ${BATCH_SIZE}`);
    console.log(`[Worker] 最大并发: ${MAX_CONCURRENT}`);

    this.timer = setInterval(() => this.poll(), POLL_INTERVAL);
    this.poll();
  }

  async stop() {
    console.log('[Worker] 正在停止 Worker...');
    this.isShuttingDown = true;
    
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    while (activeTasks > 0) {
      console.log(`[Worker] 等待 ${activeTasks} 个任务完成...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    isRunning = false;
    console.log('[Worker] Worker 已停止');
  }
}

const worker = new QueueWorker();

process.on('SIGTERM', async () => {
  await worker.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await worker.stop();
  process.exit(0);
});

if (require.main === module) {
  worker.start();
}

module.exports = QueueWorker;
