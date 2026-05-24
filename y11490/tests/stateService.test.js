const { initDatabase, closeDatabase, run } = require('../src/database');
const batchService = require('../src/services/batchService');
const stateService = require('../src/services/stateService');

beforeAll(async () => {
  await initDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

describe('State Machine Enforcement Tests', () => {
  let testBatchId;

  beforeEach(async () => {
    const batch = await batchService.createBatch({
      projectName: '状态机测试项目',
      bidNo: 'STATE-TEST-001',
      operator: 'test_operator'
    });
    testBatchId = batch.id;
  });

  describe('FREEZE Action Validation', () => {
    test('DRAFT status cannot be frozen directly - should throw error', async () => {
      const batch = await batchService.getBatchById(testBatchId);
      expect(batch.status).toBe('DRAFT');

      await expect(
        stateService.freezeBatch(testBatchId, 'operator', '测试冻结')
      ).rejects.toThrow('Invalid transition: cannot perform FREEZE from status DRAFT');
    });

    test('SUBMITTED status can be frozen', async () => {
      await stateService.transitionState(testBatchId, 'SUBMIT', 'operator');
      
      const batch = await batchService.getBatchById(testBatchId);
      expect(batch.status).toBe('SUBMITTED');

      const result = await stateService.freezeBatch(testBatchId, 'operator', '测试冻结');
      expect(result.frozen).toBe(true);
      expect(result.previousStatus).toBe('SUBMITTED');

      const updatedBatch = await batchService.getBatchById(testBatchId);
      expect(updatedBatch.status).toBe('FROZEN');
      expect(updatedBatch.is_frozen).toBe(1);
    });

    test('UNDER_REVIEW status can be frozen', async () => {
      await stateService.transitionState(testBatchId, 'SUBMIT', 'operator');
      await stateService.transitionState(testBatchId, 'REVIEW', 'operator');
      
      const batch = await batchService.getBatchById(testBatchId);
      expect(batch.status).toBe('UNDER_REVIEW');

      const result = await stateService.freezeBatch(testBatchId, 'operator', '复核中冻结');
      expect(result.frozen).toBe(true);
    });

    test('REVIEW_PASSED status can be frozen', async () => {
      await stateService.transitionState(testBatchId, 'SUBMIT', 'operator');
      await stateService.transitionState(testBatchId, 'REVIEW', 'operator');
      await stateService.transitionState(testBatchId, 'REVIEW', 'operator');
      
      const batch = await batchService.getBatchById(testBatchId);
      expect(batch.status).toBe('REVIEW_PASSED');

      const result = await stateService.freezeBatch(testBatchId, 'operator', '复核通过冻结');
      expect(result.frozen).toBe(true);
    });
  });

  describe('UNFREEZE Action Validation', () => {
    test('FROZEN status can be unfrozen', async () => {
      await stateService.transitionState(testBatchId, 'SUBMIT', 'operator');
      await stateService.freezeBatch(testBatchId, 'operator', '测试冻结');
      
      const batch = await batchService.getBatchById(testBatchId);
      expect(batch.status).toBe('FROZEN');

      const result = await stateService.unfreezeBatch(testBatchId, 'operator', '解冻测试');
      expect(result.unfrozen).toBe(true);
      expect(result.restoredStatus).toBe('SUBMITTED');

      const updatedBatch = await batchService.getBatchById(testBatchId);
      expect(updatedBatch.status).toBe('SUBMITTED');
      expect(updatedBatch.is_frozen).toBe(0);
    });

    test('Non-FROZEN status cannot be unfrozen', async () => {
      const batch = await batchService.getBatchById(testBatchId);
      expect(batch.status).toBe('DRAFT');

      await expect(
        stateService.unfreezeBatch(testBatchId, 'operator', '解冻测试')
      ).rejects.toThrow('Batch is not frozen');
    });
  });

  describe('Full State Flow with Freeze', () => {
    test('Complete flow: DRAFT -> SUBMITTED -> FROZEN -> UNFROZEN -> REVIEW_PASSED -> SETTLED -> ARCHIVED', async () => {
      console.log('  1. DRAFT -> SUBMITTED');
      await stateService.transitionState(testBatchId, 'SUBMIT', 'operator');
      let batch = await batchService.getBatchById(testBatchId);
      expect(batch.status).toBe('SUBMITTED');

      console.log('  2. SUBMITTED -> FROZEN');
      await stateService.freezeBatch(testBatchId, 'operator', '合规检查冻结');
      batch = await batchService.getBatchById(testBatchId);
      expect(batch.status).toBe('FROZEN');

      console.log('  3. FROZEN -> SUBMITTED (unfreeze)');
      await stateService.unfreezeBatch(testBatchId, 'operator', '合规检查通过');
      batch = await batchService.getBatchById(testBatchId);
      expect(batch.status).toBe('SUBMITTED');

      console.log('  4. SUBMITTED -> UNDER_REVIEW');
      await stateService.transitionState(testBatchId, 'REVIEW', 'operator');
      batch = await batchService.getBatchById(testBatchId);
      expect(batch.status).toBe('UNDER_REVIEW');

      console.log('  5. UNDER_REVIEW -> REVIEW_PASSED');
      await stateService.transitionState(testBatchId, 'REVIEW', 'operator');
      batch = await batchService.getBatchById(testBatchId);
      expect(batch.status).toBe('REVIEW_PASSED');

      console.log('  6. REVIEW_PASSED -> SETTLED');
      await stateService.transitionState(testBatchId, 'SETTLE', 'operator');
      batch = await batchService.getBatchById(testBatchId);
      expect(batch.status).toBe('SETTLED');

      console.log('  7. SETTLED -> ARCHIVED');
      await stateService.transitionState(testBatchId, 'ARCHIVE', 'operator');
      batch = await batchService.getBatchById(testBatchId);
      expect(batch.status).toBe('ARCHIVED');

      console.log('  ✓ Full flow completed successfully!');
    });
  });

  describe('Invalid Transitions Rejected', () => {
    test('DRAFT cannot directly REVIEW', async () => {
      await expect(
        stateService.transitionState(testBatchId, 'REVIEW', 'operator')
      ).rejects.toThrow('Invalid transition');
    });

    test('DRAFT cannot directly SETTLE', async () => {
      await expect(
        stateService.transitionState(testBatchId, 'SETTLE', 'operator')
      ).rejects.toThrow('Invalid transition');
    });

    test('DRAFT cannot directly ARCHIVE', async () => {
      await expect(
        stateService.transitionState(testBatchId, 'ARCHIVE', 'operator')
      ).rejects.toThrow('Invalid transition');
    });

    test('ARCHIVED is terminal - no actions allowed', async () => {
      await stateService.transitionState(testBatchId, 'SUBMIT', 'operator');
      await stateService.transitionState(testBatchId, 'REVIEW', 'operator');
      await stateService.transitionState(testBatchId, 'REVIEW', 'operator');
      await stateService.transitionState(testBatchId, 'SETTLE', 'operator');
      await stateService.transitionState(testBatchId, 'ARCHIVE', 'operator');

      await expect(
        stateService.transitionState(testBatchId, 'SETTLE', 'operator')
      ).rejects.toThrow('Invalid transition');
    });
  });

  describe('Frozen Batch Protection', () => {
    test('Frozen batch cannot perform other actions except UNFREEZE', async () => {
      await stateService.transitionState(testBatchId, 'SUBMIT', 'operator');
      await stateService.freezeBatch(testBatchId, 'operator', '测试冻结');

      await expect(
        stateService.transitionState(testBatchId, 'REVIEW', 'operator')
      ).rejects.toThrow('Batch is frozen, only UNFREEZE action is allowed');
    });
  });
});
