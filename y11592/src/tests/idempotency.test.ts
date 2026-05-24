import { DataSourceType, IdempotencyStrategy } from '../types';
import { retryQueueService, idempotencyService } from '../services';
import { RetryQueue } from '../models';

describe('幂等性测试', () => {
  const testData = {
    waveNo: 'WAVE-001',
    warehouseCode: 'WH-001',
    waveType: 'NORMAL',
    totalOrders: 10,
    totalSkus: 5,
    totalQty: 100,
    status: 'PICKING',
  };

  describe('忽略策略 (IGNORE)', () => {
    it('重复提交应返回已存在记录', async () => {
      const submit1 = await retryQueueService.submit({
        sourceType: DataSourceType.WAVE_ORDER,
        sourceId: 'WAVE-001',
        sourceData: testData,
        idempotencyStrategy: IdempotencyStrategy.IGNORE,
        submittedBy: 'user-001',
        batchId: 'BATCH-001',
      });

      expect(submit1.success).toBe(true);
      expect(submit1.action).toBe('created');

      const submit2 = await retryQueueService.submit({
        sourceType: DataSourceType.WAVE_ORDER,
        sourceId: 'WAVE-001',
        sourceData: { ...testData, status: 'COMPLETED' },
        idempotencyStrategy: IdempotencyStrategy.IGNORE,
        submittedBy: 'user-001',
        batchId: 'BATCH-001',
      });

      expect(submit2.success).toBe(true);
      expect(submit2.action).toBe('ignored');
      expect(submit2.retryQueueId).toBe(submit1.retryQueueId);

      const count = await RetryQueue.count();
      expect(count).toBe(1);

      const record = await RetryQueue.findByPk(submit1.retryQueueId!);
      expect(record!.sourceData.status).toBe('PICKING');
    });
  });

  describe('覆盖策略 (OVERWRITE)', () => {
    it('重复提交应覆盖原有数据', async () => {
      const submit1 = await retryQueueService.submit({
        sourceType: DataSourceType.WAVE_ORDER,
        sourceId: 'WAVE-001',
        sourceData: testData,
        idempotencyStrategy: IdempotencyStrategy.OVERWRITE,
        submittedBy: 'user-001',
        batchId: 'BATCH-001',
      });

      expect(submit1.action).toBe('created');

      const newData = { ...testData, status: 'COMPLETED', pickedQty: 100 };
      const submit2 = await retryQueueService.submit({
        sourceType: DataSourceType.WAVE_ORDER,
        sourceId: 'WAVE-001',
        sourceData: newData,
        idempotencyStrategy: IdempotencyStrategy.OVERWRITE,
        submittedBy: 'user-001',
        batchId: 'BATCH-001',
      });

      expect(submit2.action).toBe('overwritten');
      expect(submit2.retryQueueId).toBe(submit1.retryQueueId);

      const count = await RetryQueue.count();
      expect(count).toBe(1);

      const record = await RetryQueue.findByPk(submit1.retryQueueId!);
      expect(record!.sourceData.status).toBe('COMPLETED');
      expect(record!.sourceData.pickedQty).toBe(100);
    });
  });

  describe('追加策略 (APPEND)', () => {
    it('重复提交应追加数据', async () => {
      const submit1 = await retryQueueService.submit({
        sourceType: DataSourceType.WAVE_ORDER,
        sourceId: 'WAVE-001',
        sourceData: { ...testData, extra: { logs: ['log1'] } },
        idempotencyStrategy: IdempotencyStrategy.APPEND,
        submittedBy: 'user-001',
        batchId: 'BATCH-001',
      });

      expect(submit1.action).toBe('created');

      const submit2 = await retryQueueService.submit({
        sourceType: DataSourceType.WAVE_ORDER,
        sourceId: 'WAVE-001',
        sourceData: { ...testData, extra: { logs: ['log2'] }, pickedQty: 50 },
        idempotencyStrategy: IdempotencyStrategy.APPEND,
        submittedBy: 'user-001',
        batchId: 'BATCH-001',
      });

      expect(submit2.action).toBe('appended');

      const record = await RetryQueue.findByPk(submit1.retryQueueId!);
      expect(record!.sourceData.extra.logs).toEqual(['log1', 'log2']);
      expect(record!.sourceData.pickedQty).toBe(50);
    });
  });

  describe('幂等性Key生成', () => {
    it('相同参数生成相同key', () => {
      const key1 = idempotencyService.generateIdempotencyKey(
        DataSourceType.WAVE_ORDER,
        'WAVE-001',
        'BATCH-001'
      );
      const key2 = idempotencyService.generateIdempotencyKey(
        DataSourceType.WAVE_ORDER,
        'WAVE-001',
        'BATCH-001'
      );
      expect(key1).toBe(key2);
    });

    it('不同sourceType生成不同key', () => {
      const key1 = idempotencyService.generateIdempotencyKey(
        DataSourceType.WAVE_ORDER,
        'ID-001',
        'BATCH-001'
      );
      const key2 = idempotencyService.generateIdempotencyKey(
        DataSourceType.PICKING_DIFFERENCE,
        'ID-001',
        'BATCH-001'
      );
      expect(key1).not.toBe(key2);
    });

    it('不同batchId生成不同key', () => {
      const key1 = idempotencyService.generateIdempotencyKey(
        DataSourceType.WAVE_ORDER,
        'ID-001',
        'BATCH-001'
      );
      const key2 = idempotencyService.generateIdempotencyKey(
        DataSourceType.WAVE_ORDER,
        'ID-001',
        'BATCH-002'
      );
      expect(key1).not.toBe(key2);
    });
  });
});
