import { DataSourceType, IdempotencyStrategy, RetryStatus } from '../types';
import { retryQueueService, exportService, operationLogService } from '../services';
import { WaveOrder, RetryQueue } from '../models';

describe('导出与一致性测试', () => {
  const BATCH_ID = 'EXPORT-BATCH-001';

  const createTestWaveOrder = (waveNo: string) => ({
    waveNo,
    warehouseCode: 'WH-001',
    waveType: 'NORMAL',
    totalOrders: 10,
    totalSkus: 5,
    totalQty: 100,
    status: 'PICKING',
  });

  const createPickingDiff = (diffNo: string) => ({
    differenceNo: diffNo,
    waveNo: 'WAVE-001',
    warehouseCode: 'WH-001',
    skuCode: 'SKU-001',
    expectedQty: 10,
    actualQty: 8,
    differenceQty: 2,
    differenceType: 'SHORTAGE',
    isResolved: false,
  });

  const createReviewScan = (scanNo: string) => ({
    scanNo,
    waveNo: 'WAVE-001',
    warehouseCode: 'WH-001',
    orderNo: 'ORDER-001',
    skuCode: 'SKU-001',
    scannedQty: 5,
    scanTime: new Date().toISOString(),
    isAnomaly: false,
  });

  beforeEach(async () => {
    await retryQueueService.submit({
      sourceType: DataSourceType.WAVE_ORDER,
      sourceId: 'WAVE-001',
      sourceData: createTestWaveOrder('WAVE-001'),
      idempotencyStrategy: IdempotencyStrategy.IGNORE,
      submittedBy: 'user-001',
      batchId: BATCH_ID,
    });

    await retryQueueService.submit({
      sourceType: DataSourceType.PICKING_DIFFERENCE,
      sourceId: 'DIFF-001',
      sourceData: createPickingDiff('DIFF-001'),
      idempotencyStrategy: IdempotencyStrategy.IGNORE,
      submittedBy: 'user-001',
      batchId: BATCH_ID,
    });

    await retryQueueService.submit({
      sourceType: DataSourceType.REVIEW_SCAN,
      sourceId: 'SCAN-001',
      sourceData: createReviewScan('SCAN-001'),
      idempotencyStrategy: IdempotencyStrategy.IGNORE,
      submittedBy: 'user-001',
      batchId: BATCH_ID,
    });

    await retryQueueService.processPendingItems();
  });

  describe('导出功能', () => {
    it('应导出完整的批次数据', async () => {
      const result = await exportService.export(
        { batchId: BATCH_ID, includeHistory: true },
        'manager-001',
        '导出管理员'
      );

      expect(result.waveOrders.length).toBe(1);
      expect(result.pickingDifferences.length).toBe(1);
      expect(result.reviewScans.length).toBe(1);
      expect(result.retryQueue.length).toBe(3);
      expect(result.operationLogs!.length).toBeGreaterThan(0);

      expect(result.statistics.totalWaveOrders).toBe(1);
      expect(result.statistics.totalPickingDifferences).toBe(1);
      expect(result.statistics.totalReviewScans).toBe(1);
      expect(result.statistics.totalRetryQueue).toBe(3);
      expect(result.statistics.byStatus[RetryStatus.SUCCESS]).toBe(3);
    });

    it('导出时应创建导出日志', async () => {
      await exportService.export(
        { batchId: BATCH_ID },
        'manager-001',
        '导出管理员'
      );

      const logs = await operationLogService.getBatchHistory(BATCH_ID);
      const exportLog = logs.find((l) => l.operationType === 'export');
      
      expect(exportLog).toBeDefined();
      expect(exportLog!.operatorId).toBe('manager-001');
    });
  });

  describe('一致性验证', () => {
    it('成功处理的数据应一致', async () => {
      const result = await exportService.verifyConsistency(BATCH_ID);
      expect(result.consistent).toBe(true);
      expect(result.issues.length).toBe(0);
    });

    it('冻结数据应在一致性检查中提示', async () => {
      const submitResult = await retryQueueService.submit({
        sourceType: DataSourceType.WAVE_ORDER,
        sourceId: 'WAVE-002',
        sourceData: createTestWaveOrder('WAVE-002'),
        idempotencyStrategy: IdempotencyStrategy.IGNORE,
        submittedBy: 'user-001',
        batchId: BATCH_ID,
      });

      await retryQueueService.freeze(
        submitResult.retryQueueId!,
        'manager-001',
        '导出前冻结'
      );

      const result = await exportService.verifyConsistency(BATCH_ID);
      expect(result.consistent).toBe(false);
      expect(result.issues.some((i) => i.includes('冻结'))).toBe(true);
    });

    it('待处理数据应在一致性检查中提示', async () => {
      const originalProcessData = require('../services/DataProcessingService').dataProcessingService.processData;
      require('../services/DataProcessingService').dataProcessingService.processData = jest.fn().mockRejectedValue(new Error('模拟失败'));

      try {
        await retryQueueService.submit({
          sourceType: DataSourceType.WAVE_ORDER,
          sourceId: 'WAVE-002',
          sourceData: createTestWaveOrder('WAVE-002'),
          idempotencyStrategy: IdempotencyStrategy.IGNORE,
          submittedBy: 'user-001',
          batchId: BATCH_ID,
        });

        await retryQueueService.processPendingItems();

        const result = await exportService.verifyConsistency(BATCH_ID);
        expect(result.consistent).toBe(false);
        expect(result.issues.some((i) => i.includes('待处理'))).toBe(true);
      } finally {
        require('../services/DataProcessingService').dataProcessingService.processData = originalProcessData;
      }
    });
  });

  describe('重试分类统计', () => {
    it('应按错误类型分类失败项', async () => {
      const originalProcessData = require('../services/DataProcessingService').dataProcessingService.processData;
      
      const errors = [
        new Error('Connection timeout'),
        new Error('Validation failed: invalid data'),
        new Error('Permission denied'),
        new Error('Duplicate key violation'),
      ];

      let errorIndex = 0;
      require('../services/DataProcessingService').dataProcessingService.processData = jest
        .fn()
        .mockImplementation(() => {
          throw errors[errorIndex++ % errors.length];
        });

      try {
        for (let i = 1; i <= 4; i++) {
          await retryQueueService.submit({
            sourceType: DataSourceType.WAVE_ORDER,
            sourceId: `WAVE-ERR-${i}`,
            sourceData: createTestWaveOrder(`WAVE-ERR-${i}`),
            idempotencyStrategy: IdempotencyStrategy.IGNORE,
            submittedBy: 'user-001',
            batchId: 'ERR-BATCH',
            maxAttempts: 1,
          });
        }

        await retryQueueService.processPendingItems();

        const classification = await exportService.getRetryClassification('ERR-BATCH');
        
        expect(classification.bySourceType[DataSourceType.WAVE_ORDER]).toBeGreaterThan(0);
        expect(Object.keys(classification.byErrorType).length).toBeGreaterThan(0);
        expect(classification.retryable).toBeGreaterThan(0);
        expect(classification.nonRetryable).toBeGreaterThan(0);
      } finally {
        require('../services/DataProcessingService').dataProcessingService.processData = originalProcessData;
      }
    });
  });
});
