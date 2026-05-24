const QueueService = require('./queue.service');
const { QUEUE_STATUS } = require('../constants/status');

class InventoryService {
  constructor() {
    this.inventory = {
      'IMPLANT-2024-001': 10,
      'IMPLANT-2024-002': 5,
      'BATCH-TEST-001': 20,
      'BATCH-TEST-002': 15,
      'BATCH-TEST-003': 8,
      'RECOVERY-BATCH-001': 10,
      'RECOVERY-BATCH-002': 10,
      'RECOVERY-BATCH-003': 10
    };
  }

  checkStock(batchNo) {
    return this.inventory[batchNo] || 0;
  }

  deductStock(batchNo, quantity = 1) {
    const current = this.inventory[batchNo] || 0;
    if (current < quantity) {
      throw new Error(`库存不足: ${batchNo}, 当前库存: ${current}, 需要: ${quantity}`);
    }
    this.inventory[batchNo] = current - quantity;
    return true;
  }
}

class MedicalRecordService {
  constructor() {
    this.records = new Map();
  }

  updateRecord(queueItem) {
    const recordId = queueItem.appointment_no || queueItem.batch_no;
    this.records.set(recordId, {
      batchNo: queueItem.batch_no,
      patientName: queueItem.patient_name,
      materialType: queueItem.material_type,
      materialSpec: queueItem.material_spec,
      updatedAt: new Date().toISOString(),
      status: 'COMPLETED'
    });
    return true;
  }

  getRecord(recordId) {
    return this.records.get(recordId) || null;
  }
}

class CompensationService {
  constructor() {
    this.inventoryService = new InventoryService();
    this.medicalRecordService = new MedicalRecordService();
  }

  async execute(queueItem) {
    const results = {
      inventory: false,
      medicalRecord: false,
      errors: []
    };

    try {
      const stock = this.inventoryService.checkStock(queueItem.batch_no);
      if (stock <= 0) {
        throw new Error(`种植体批号 ${queueItem.batch_no} 库存为0，无法扣减`);
      }
      this.inventoryService.deductStock(queueItem.batch_no, 1);
      results.inventory = true;
    } catch (error) {
      results.errors.push(`库存扣减失败: ${error.message}`);
    }

    try {
      if (queueItem.appointment_no || queueItem.patient_name) {
        this.medicalRecordService.updateRecord(queueItem);
        results.medicalRecord = true;
      } else {
        results.medicalRecord = true;
      }
    } catch (error) {
      results.errors.push(`病历更新失败: ${error.message}`);
    }

    if (results.errors.length > 0) {
      throw new Error(results.errors.join('; '));
    }

    return results;
  }
}

class RetryWorker {
  constructor(options = {}) {
    this.interval = options.interval || 30000;
    this.isRunning = false;
    this.timer = null;
    this.processingIds = new Set();
    this.compensationService = new CompensationService();
    this.simulateFailureRate = options.simulateFailureRate || 0;
  }

  async processItem(queueItem) {
    if (this.processingIds.has(queueItem.id)) {
      return;
    }

    this.processingIds.add(queueItem.id);
    console.log(`[RetryWorker] 开始处理队列项: ${queueItem.queue_no} (批号: ${queueItem.batch_no})`);

    try {
      await QueueService.updateStatus(queueItem.id, QUEUE_STATUS.PROCESSING, {
        remark: '补偿处理中，正在执行库存扣减和病历更新'
      });

      if (this.simulateFailureRate > 0 && Math.random() < this.simulateFailureRate) {
        throw new Error('模拟业务处理失败（用于测试重试机制）');
      }

      const result = await this.compensationService.execute(queueItem);

      await this.completeProcessing(queueItem.id, result);
      console.log(`[RetryWorker] 队列项 ${queueItem.queue_no} 补偿成功`);

    } catch (error) {
      console.error(`[RetryWorker] 处理队列项 ${queueItem.queue_no} 失败:`, error.message);
      await QueueService.markForRetry(queueItem.id, error.message, {
        retryDelayMinutes: 5
      });
    } finally {
      this.processingIds.delete(queueItem.id);
    }
  }

  async completeProcessing(queueId, result) {
    const queueItem = await QueueService.getById(queueId);
    if (!queueItem) return;

    const oldStatus = queueItem.status;

    const updatedParsedData = {
      ...(queueItem.parsed_data || {}),
      compensationResult: result,
      compensatedAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const { db } = require('../config/database');
      db.run(
        `UPDATE material_queue 
         SET status = ?, handled_by = ?, handled_at = CURRENT_TIMESTAMP, 
             completed_at = CURRENT_TIMESTAMP, parsed_data = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [QUEUE_STATUS.COMPENSATED, 'SYSTEM', JSON.stringify(updatedParsedData), queueId],
        async (err) => {
          if (err) {
            reject(err);
            return;
          }

          try {
            const TraceService = require('./trace.service');
            await TraceService.addTrace(queueId, 'COMPENSATE', {
              fromStatus: oldStatus,
              toStatus: QUEUE_STATUS.COMPENSATED,
              operator: 'SYSTEM',
              remark: '自动补偿入账完成',
              traceData: updatedParsedData
            });
            resolve();
          } catch (traceErr) {
            reject(traceErr);
          }
        }
      );
    });
  }

  async processBatch() {
    try {
      const items = await QueueService.getRetryableItems();
      if (items.length > 0) {
        console.log(`[RetryWorker] 发现 ${items.length} 个可重试项`);
      }

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

  getProcessingCount() {
    return this.processingIds.size;
  }

  getInventoryStatus() {
    return this.compensationService.inventoryService.inventory;
  }
}

module.exports = RetryWorker;
