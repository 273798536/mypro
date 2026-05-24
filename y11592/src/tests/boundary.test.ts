import { DataSourceType, IdempotencyStrategy, RetryStatus, OperationType } from '../types';
import { retryQueueService, operationLogService, exportService } from '../services';
import { RetryQueue, OperationLog } from '../models';

describe('边界情况测试', () => {
  const createTestWaveOrder = (waveNo: string) => ({
    waveNo,
    warehouseCode: 'WH-001',
    waveType: 'NORMAL',
    totalOrders: 10,
    totalSkus: 5,
    totalQty: 100,
    status: 'PICKING',
  });

  describe('冻结与解冻', () => {
    it('应能冻结待处理项', async () => {
      const result = await retryQueueService.submit({
        sourceType: DataSourceType.WAVE_ORDER,
        sourceId: 'WAVE-001',
        sourceData: createTestWaveOrder('WAVE-001'),
        idempotencyStrategy: IdempotencyStrategy.IGNORE,
        submittedBy: 'user-001',
        batchId: 'BATCH-001',
      });

      const frozen = await retryQueueService.freeze(
        result.retryQueueId!,
        'manager-001',
        '导出前冻结，等待确认',
        '张经理'
      );

      expect(frozen.status).toBe(RetryStatus.FROZEN);
      expect(frozen.frozenBy).toBe('manager-001');
      expect(frozen.frozenReason).toBe('导出前冻结，等待确认');
      expect(frozen.frozenAt).toBeDefined();

      const logs = await operationLogService.getEntityHistory(
        'retry_queue',
        result.retryQueueId!
      );
      const freezeLog = logs.find((l) => l.operationType === OperationType.FREEZE);
      expect(freezeLog).toBeDefined();
    });

    it('冻结的项不会被处理', async () => {
      const result = await retryQueueService.submit({
        sourceType: DataSourceType.WAVE_ORDER,
        sourceId: 'WAVE-001',
        sourceData: createTestWaveOrder('WAVE-001'),
        idempotencyStrategy: IdempotencyStrategy.IGNORE,
        submittedBy: 'user-001',
        batchId: 'BATCH-001',
      });

      await retryQueueService.freeze(
        result.retryQueueId!,
        'manager-001',
        '测试冻结'
      );

      const processResult = await retryQueueService.processPendingItems();
      expect(processResult.processed).toBe(0);

      const record = await RetryQueue.findByPk(result.retryQueueId!);
      expect(record!.status).toBe(RetryStatus.FROZEN);
      expect(record!.attemptCount).toBe(0);
    });

    it('应能解冻冻结项并重新加入队列', async () => {
      const result = await retryQueueService.submit({
        sourceType: DataSourceType.WAVE_ORDER,
        sourceId: 'WAVE-001',
        sourceData: createTestWaveOrder('WAVE-001'),
        idempotencyStrategy: IdempotencyStrategy.IGNORE,
        submittedBy: 'user-001',
        batchId: 'BATCH-001',
      });

      await retryQueueService.freeze(result.retryQueueId!, 'manager-001', '测试冻结');
      
      const unfrozen = await retryQueueService.unfreeze(
        result.retryQueueId!,
        'manager-001',
        '张经理'
      );

      expect(unfrozen.status).toBe(RetryStatus.PENDING);
      expect(unfrozen.frozenBy).toBeNull();
      expect(unfrozen.frozenReason).toBeNull();

      const processResult = await retryQueueService.processPendingItems();
      expect(processResult.processed).toBe(1);
    });

    it('只能解冻冻结状态的项', async () => {
      const result = await retryQueueService.submit({
        sourceType: DataSourceType.WAVE_ORDER,
        sourceId: 'WAVE-001',
        sourceData: createTestWaveOrder('WAVE-001'),
        idempotencyStrategy: IdempotencyStrategy.IGNORE,
        submittedBy: 'user-001',
        batchId: 'BATCH-001',
      });

      await expect(
        retryQueueService.unfreeze(result.retryQueueId!, 'manager-001')
      ).rejects.toThrow('只能解冻状态为 frozen 的项');
    });
  });

  describe('人工改判', () => {
    it('人工批准应标记为成功', async () => {
      const result = await retryQueueService.submit({
        sourceType: DataSourceType.WAVE_ORDER,
        sourceId: 'WAVE-001',
        sourceData: createTestWaveOrder('WAVE-001'),
        idempotencyStrategy: IdempotencyStrategy.IGNORE,
        submittedBy: 'user-001',
        batchId: 'BATCH-001',
      });

      const decision = await retryQueueService.manualDecision(
        result.retryQueueId!,
        'manager-001',
        'approve',
        '数据确认无误，人工批准',
        '张经理'
      );

      expect(decision.status).toBe(RetryStatus.SUCCESS);
      expect(decision.manualDecisionBy).toBe('manager-001');
      expect(decision.manualDecisionNote).toBe('数据确认无误，人工批准');
    });

    it('人工拒绝应标记为已取消', async () => {
      const result = await retryQueueService.submit({
        sourceType: DataSourceType.WAVE_ORDER,
        sourceId: 'WAVE-001',
        sourceData: createTestWaveOrder('WAVE-001'),
        idempotencyStrategy: IdempotencyStrategy.IGNORE,
        submittedBy: 'user-001',
        batchId: 'BATCH-001',
      });

      const decision = await retryQueueService.manualDecision(
        result.retryQueueId!,
        'manager-001',
        'reject',
        '数据有误，驳回'
      );

      expect(decision.status).toBe(RetryStatus.CANCELLED);
    });

    it('人工重试应重置重试次数', async () => {
      const originalProcessData = require('../services/DataProcessingService').dataProcessingService.processData;
      require('../services/DataProcessingService').dataProcessingService.processData = jest.fn().mockRejectedValue(new Error('模拟失败'));

      try {
        const result = await retryQueueService.submit({
          sourceType: DataSourceType.WAVE_ORDER,
          sourceId: 'WAVE-001',
          sourceData: createTestWaveOrder('WAVE-001'),
          idempotencyStrategy: IdempotencyStrategy.IGNORE,
          submittedBy: 'user-001',
          batchId: 'BATCH-001',
        });

        await retryQueueService.processPendingItems();
        let record = await RetryQueue.findByPk(result.retryQueueId!);
        expect(record!.attemptCount).toBe(1);

        const decision = await retryQueueService.manualDecision(
          result.retryQueueId!,
          'manager-001',
          'retry',
          '人工重试'
        );

        expect(decision.status).toBe(RetryStatus.PENDING);
        expect(decision.attemptCount).toBe(0);
      } finally {
        require('../services/DataProcessingService').dataProcessingService.processData = originalProcessData;
      }
    });
  });

  describe('撤回后再提交', () => {
    it('取消后重新提交应创建新记录', async () => {
      const submit1 = await retryQueueService.submit({
        sourceType: DataSourceType.WAVE_ORDER,
        sourceId: 'WAVE-001',
        sourceData: createTestWaveOrder('WAVE-001'),
        idempotencyStrategy: IdempotencyStrategy.IGNORE,
        submittedBy: 'user-001',
        batchId: 'BATCH-001',
      });

      await retryQueueService.cancel(submit1.retryQueueId!, 'user-001');

      const submit2 = await retryQueueService.submit({
        sourceType: DataSourceType.WAVE_ORDER,
        sourceId: 'WAVE-001',
        sourceData: { ...createTestWaveOrder('WAVE-001'), status: 'UPDATED' },
        idempotencyStrategy: IdempotencyStrategy.IGNORE,
        submittedBy: 'user-001',
        batchId: 'BATCH-002',
      });

      expect(submit2.action).toBe('created');
      expect(submit2.retryQueueId).not.toBe(submit1.retryQueueId);

      const count = await RetryQueue.count();
      expect(count).toBe(2);
    });
  });

  describe('部分失败处理', () => {
    it('批量提交部分失败应保留成功记录', async () => {
      const items = [
        {
          sourceType: DataSourceType.WAVE_ORDER,
          sourceId: 'WAVE-001',
          sourceData: createTestWaveOrder('WAVE-001'),
          idempotencyStrategy: IdempotencyStrategy.IGNORE,
        },
        {
          sourceType: 'INVALID_TYPE',
          sourceId: 'INVALID',
          sourceData: {},
          idempotencyStrategy: IdempotencyStrategy.IGNORE,
        },
        {
          sourceType: DataSourceType.PICKING_DIFFERENCE,
          sourceId: 'DIFF-001',
          sourceData: {
            differenceNo: 'DIFF-001',
            waveNo: 'WAVE-001',
            warehouseCode: 'WH-001',
            skuCode: 'SKU-001',
            expectedQty: 10,
            actualQty: 8,
            differenceQty: 2,
            differenceType: 'SHORTAGE',
            isResolved: false,
          },
          idempotencyStrategy: IdempotencyStrategy.IGNORE,
        },
      ];

      const req = { user: { userId: 'user-001', userName: '测试用户' } } as any;
      const result = await (async () => {
        const results = [];
        let successCount = 0;
        let failedCount = 0;

        for (const item of items) {
          try {
            const r = await retryQueueService.submit({
              ...item,
              submittedBy: req.user.userId,
              submittedByName: req.user.userName,
            });
            results.push({ ...r, item });
            if (r.success) successCount++;
            else failedCount++;
          } catch (error: any) {
            results.push({
              success: false,
              action: 'error',
              message: error.message,
              item,
            });
            failedCount++;
          }
        }

        return { total: items.length, success: successCount, failed: failedCount, results };
      })();

      expect(result.total).toBe(3);
      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);

      const successCount = await RetryQueue.count();
      expect(successCount).toBe(2);
    });
  });
});
