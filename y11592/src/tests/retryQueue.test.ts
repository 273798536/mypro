import { DataSourceType, IdempotencyStrategy, RetryStatus, OperationType } from '../types';
import { retryQueueService, operationLogService } from '../services';
import { RetryQueue, OperationLog, DeadLetterQueue, WaveOrder } from '../models';
import { config } from '../config';

describe('重试队列测试', () => {
  const createTestWaveOrder = (waveNo: string) => ({
    waveNo,
    warehouseCode: 'WH-001',
    waveType: 'NORMAL',
    totalOrders: 10,
    totalSkus: 5,
    totalQty: 100,
    status: 'PICKING',
  });

  describe('提交数据', () => {
    it('应成功提交到重试队列', async () => {
      const result = await retryQueueService.submit({
        sourceType: DataSourceType.WAVE_ORDER,
        sourceId: 'WAVE-001',
        sourceData: createTestWaveOrder('WAVE-001'),
        idempotencyStrategy: IdempotencyStrategy.IGNORE,
        submittedBy: 'user-001',
        submittedByName: '测试用户',
        batchId: 'BATCH-001',
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('created');
      expect(result.retryQueueId).toBeDefined();

      const record = await RetryQueue.findByPk(result.retryQueueId!);
      expect(record).not.toBeNull();
      expect(record!.sourceType).toBe(DataSourceType.WAVE_ORDER);
      expect(record!.sourceId).toBe('WAVE-001');
      expect(record!.status).toBe(RetryStatus.PENDING);
      expect(record!.attemptCount).toBe(0);
      expect(record!.submittedBy).toBe('user-001');
      expect(record!.batchId).toBe('BATCH-001');
    });

    it('应创建操作日志', async () => {
      const result = await retryQueueService.submit({
        sourceType: DataSourceType.WAVE_ORDER,
        sourceId: 'WAVE-001',
        sourceData: createTestWaveOrder('WAVE-001'),
        idempotencyStrategy: IdempotencyStrategy.IGNORE,
        submittedBy: 'user-001',
        batchId: 'BATCH-001',
      });

      const logs = await operationLogService.getEntityHistory(
        'retry_queue',
        result.retryQueueId!
      );

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].operationType).toBe(OperationType.SUBMIT);
      expect(logs[0].operatorId).toBe('user-001');
    });
  });

  describe('处理队列', () => {
    it('应成功处理待处理项并写入业务表', async () => {
      await retryQueueService.submit({
        sourceType: DataSourceType.WAVE_ORDER,
        sourceId: 'WAVE-001',
        sourceData: createTestWaveOrder('WAVE-001'),
        idempotencyStrategy: IdempotencyStrategy.IGNORE,
        submittedBy: 'user-001',
        batchId: 'BATCH-001',
      });

      const pendingBefore = await RetryQueue.count({ where: { status: RetryStatus.PENDING } });
      expect(pendingBefore).toBe(1);

      const result = await retryQueueService.processPendingItems();
      expect(result.processed).toBe(1);
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);

      const successCount = await RetryQueue.count({ where: { status: RetryStatus.SUCCESS } });
      expect(successCount).toBe(1);

      const waveOrder = await WaveOrder.findOne({ where: { waveNo: 'WAVE-001' } });
      expect(waveOrder).not.toBeNull();
      expect(waveOrder!.warehouseCode).toBe('WH-001');
    });

    it('应设置nextAttemptAt并进行退避重试', async () => {
      const originalProcessData = require('../services/DataProcessingService').dataProcessingService.processData;
      require('../services/DataProcessingService').dataProcessingService.processData = jest.fn().mockRejectedValue(new Error('模拟处理失败'));

      try {
        await retryQueueService.submit({
          sourceType: DataSourceType.WAVE_ORDER,
          sourceId: 'WAVE-001',
          sourceData: createTestWaveOrder('WAVE-001'),
          idempotencyStrategy: IdempotencyStrategy.IGNORE,
          submittedBy: 'user-001',
          batchId: 'BATCH-001',
          maxAttempts: 3,
        });

        await retryQueueService.processPendingItems();

        const record = await RetryQueue.findOne({ where: { sourceId: 'WAVE-001' } });
        expect(record!.status).toBe(RetryStatus.FAILED);
        expect(record!.attemptCount).toBe(1);
        expect(record!.lastError).toBe('模拟处理失败');
        expect(record!.nextAttemptAt).toBeDefined();
      } finally {
        require('../services/DataProcessingService').dataProcessingService.processData = originalProcessData;
      }
    });

    it('超过最大重试次数应移入死信队列', async () => {
      const originalProcessData = require('../services/DataProcessingService').dataProcessingService.processData;
      require('../services/DataProcessingService').dataProcessingService.processData = jest.fn().mockRejectedValue(new Error('模拟处理失败'));

      try {
        const maxAttempts = 2;
        await retryQueueService.submit({
          sourceType: DataSourceType.WAVE_ORDER,
          sourceId: 'WAVE-001',
          sourceData: createTestWaveOrder('WAVE-001'),
          idempotencyStrategy: IdempotencyStrategy.IGNORE,
          submittedBy: 'user-001',
          batchId: 'BATCH-001',
          maxAttempts,
        });

        for (let i = 0; i < maxAttempts + 1; i++) {
          const record = await RetryQueue.findOne({ where: { sourceId: 'WAVE-001' } });
          if (record) {
            record.nextAttemptAt = new Date();
            await record.save();
          }
          await retryQueueService.processPendingItems();
        }

        const deadLetterCount = await DeadLetterQueue.count();
        expect(deadLetterCount).toBe(1);

        const deadLetter = await DeadLetterQueue.findOne();
        expect(deadLetter!.attemptCount).toBeGreaterThanOrEqual(maxAttempts);
        expect(deadLetter!.deadLetterReason).toContain('超过最大重试次数');
      } finally {
        require('../services/DataProcessingService').dataProcessingService.processData = originalProcessData;
      }
    });
  });

  describe('取消操作', () => {
    it('应能取消待处理项', async () => {
      const result = await retryQueueService.submit({
        sourceType: DataSourceType.WAVE_ORDER,
        sourceId: 'WAVE-001',
        sourceData: createTestWaveOrder('WAVE-001'),
        idempotencyStrategy: IdempotencyStrategy.IGNORE,
        submittedBy: 'user-001',
        batchId: 'BATCH-001',
      });

      const cancelled = await retryQueueService.cancel(
        result.retryQueueId!,
        'operator-001',
        '操作员'
      );

      expect(cancelled.status).toBe(RetryStatus.CANCELLED);

      const logs = await operationLogService.getEntityHistory(
        'retry_queue',
        result.retryQueueId!
      );
      const cancelLog = logs.find((l) => l.operationType === OperationType.CANCEL);
      expect(cancelLog).toBeDefined();
      expect(cancelLog!.operatorId).toBe('operator-001');
    });

    it('已成功的项不能取消', async () => {
      const result = await retryQueueService.submit({
        sourceType: DataSourceType.WAVE_ORDER,
        sourceId: 'WAVE-001',
        sourceData: createTestWaveOrder('WAVE-001'),
        idempotencyStrategy: IdempotencyStrategy.IGNORE,
        submittedBy: 'user-001',
        batchId: 'BATCH-001',
      });

      await retryQueueService.processPendingItems();

      await expect(
        retryQueueService.cancel(result.retryQueueId!, 'operator-001')
      ).rejects.toThrow('无法取消状态为');
    });
  });
});
