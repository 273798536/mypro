const { execSync } = require('child_process');
const path = require('path');

function initTestDb() {
  execSync('node scripts/init-db.js', {
    cwd: path.join(__dirname, '..'),
    stdio: 'pipe'
  });
}

function getServices() {
  const CompensationQueueService = require('../src/services/compensationQueueService');
  const AuditService = require('../src/services/auditService');
  return { CompensationQueueService, AuditService };
}

const { QUEUE_STATUS, SOURCE_TYPES, ACTION_TYPES } = require('../src/constants');

describe('补偿队列 - 幂等性测试', () => {
  test('重复提交相同回执应返回重复标记，不创建新记录', async () => {
    initTestDb();
    const { CompensationQueueService } = getServices();

    const submitData = {
      sourceType: SOURCE_TYPES.STORE_COMPLAINT,
      sourceId: 'CP20240115001',
      batchNo: 'BATCH20240115001',
      potNo: 'POT001',
      storeCode: 'ST001',
      storeName: '北京朝阳门店',
      productName: '红烧肉',
      actionType: ACTION_TYPES.RECEIPT_SUBMIT,
      payload: { complaintId: 'CP20240115001' }
    };

    const result1 = await CompensationQueueService.submitReceipt(submitData);
    const result2 = await CompensationQueueService.submitReceipt(submitData);

    expect(result1.isDuplicate).toBe(false);
    expect(result2.isDuplicate).toBe(true);
    expect(result1.queueItem.id).toBe(result2.queueItem.id);

    const stats = await CompensationQueueService.getStatistics();
    expect(stats.total).toBe(1);
  });

  test('不同源数据应创建不同记录', async () => {
    initTestDb();
    const { CompensationQueueService } = getServices();

    const result1 = await CompensationQueueService.submitReceipt({
      sourceType: SOURCE_TYPES.STORE_COMPLAINT,
      sourceId: 'CP20240115001',
      batchNo: 'BATCH20240115001',
      potNo: 'POT001',
      actionType: ACTION_TYPES.RECEIPT_SUBMIT
    });

    const result2 = await CompensationQueueService.submitReceipt({
      sourceType: SOURCE_TYPES.STORE_COMPLAINT,
      sourceId: 'CP20240115002',
      batchNo: 'BATCH20240115001',
      potNo: 'POT001',
      actionType: ACTION_TYPES.RECEIPT_SUBMIT
    });

    expect(result1.isDuplicate).toBe(false);
    expect(result2.isDuplicate).toBe(false);
    expect(result1.queueItem.id).not.toBe(result2.queueItem.id);

    const stats = await CompensationQueueService.getStatistics();
    expect(stats.total).toBe(2);
  });
});

describe('补偿队列 - 状态变化测试', () => {
  test('完整状态流转: pending -> processing -> success', async () => {
    initTestDb();
    const { CompensationQueueService } = getServices();

    const { queueItem } = await CompensationQueueService.submitReceipt({
      sourceType: SOURCE_TYPES.STORE_COMPLAINT,
      sourceId: 'CP20240115001',
      batchNo: 'BATCH20240115001',
      potNo: 'POT001',
      actionType: ACTION_TYPES.RECEIPT_SUBMIT
    });

    expect(queueItem.status).toBe(QUEUE_STATUS.PENDING);

    const processingItem = await CompensationQueueService.startProcessing(queueItem.id);
    expect(processingItem.status).toBe(QUEUE_STATUS.PROCESSING);

    const successItem = await CompensationQueueService.markSuccess(queueItem.id, '处理成功');
    expect(successItem.status).toBe(QUEUE_STATUS.SUCCESS);
    expect(successItem.result).toBeDefined();
  });

  test('处理失败后转等待重试状态', async () => {
    initTestDb();
    const { CompensationQueueService } = getServices();

    const { queueItem } = await CompensationQueueService.submitReceipt({
      sourceType: SOURCE_TYPES.STORE_COMPLAINT,
      sourceId: 'CP20240115001',
      batchNo: 'BATCH20240115001',
      potNo: 'POT001',
      actionType: ACTION_TYPES.RECEIPT_SUBMIT,
      maxRetryCount: 3
    });

    await CompensationQueueService.startProcessing(queueItem.id);

    const retryItem = await CompensationQueueService.markRetry(
      queueItem.id,
      '外部系统调用超时',
      'NETWORK_ERROR'
    );

    expect(retryItem.status).toBe(QUEUE_STATUS.WAITING_RETRY);
    expect(retryItem.retry_count).toBe(1);
    expect(retryItem.last_error).toBe('外部系统调用超时');
    expect(retryItem.next_retry_time).toBeDefined();
  });

  test('重试次数超限后转永久失败', async () => {
    initTestDb();
    const { CompensationQueueService } = getServices();

    const { queueItem } = await CompensationQueueService.submitReceipt({
      sourceType: SOURCE_TYPES.STORE_COMPLAINT,
      sourceId: 'CP20240115001',
      batchNo: 'BATCH20240115001',
      potNo: 'POT001',
      actionType: ACTION_TYPES.RECEIPT_SUBMIT,
      maxRetryCount: 2,
      retryInterval: 1
    });

    await CompensationQueueService.startProcessing(queueItem.id);
    await CompensationQueueService.markRetry(queueItem.id, '第一次失败', 'ERROR');

    let item = await CompensationQueueService.getById(queueItem.id);
    expect(item.status).toBe(QUEUE_STATUS.WAITING_RETRY);
    expect(item.retry_count).toBe(1);

    await CompensationQueueService.startProcessing(queueItem.id);
    const failedItem = await CompensationQueueService.markRetry(queueItem.id, '第二次失败', 'ERROR');

    expect(failedItem.status).toBe(QUEUE_STATUS.PERMANENT_FAILED);
    expect(failedItem.retry_count).toBe(2);
  });

  test('转人工处理状态', async () => {
    initTestDb();
    const { CompensationQueueService } = getServices();

    const { queueItem } = await CompensationQueueService.submitReceipt({
      sourceType: SOURCE_TYPES.STORE_COMPLAINT,
      sourceId: 'CP20240115001',
      batchNo: 'BATCH20240115001',
      potNo: 'POT001',
      actionType: ACTION_TYPES.RECEIPT_SUBMIT
    });

    const manualItem = await CompensationQueueService.markManualIntervention(
      queueItem.id,
      'operator-001',
      '品控主管',
      '需要人工核实投诉内容'
    );

    expect(manualItem.status).toBe(QUEUE_STATUS.WAITING_MANUAL);
    expect(manualItem.handled_by).toBe('operator-001');
  });

  test('人工补偿后状态变更', async () => {
    initTestDb();
    const { CompensationQueueService } = getServices();

    const { queueItem } = await CompensationQueueService.submitReceipt({
      sourceType: SOURCE_TYPES.STORE_COMPLAINT,
      sourceId: 'CP20240115001',
      batchNo: 'BATCH20240115001',
      potNo: 'POT001',
      actionType: ACTION_TYPES.RECEIPT_SUBMIT
    });

    await CompensationQueueService.markManualIntervention(queueItem.id, 'operator-001', '品控主管');

    const compensatedItem = await CompensationQueueService.manualCompensate(
      queueItem.id,
      {
        method: 'manual_refund',
        amount: 100,
        remark: '已与门店协商解决'
      },
      'operator-001',
      '品控主管'
    );

    expect(compensatedItem.status).toBe(QUEUE_STATUS.COMPENSATED);
    expect(compensatedItem.completed_at).toBeDefined();
  });

  test('关闭队列项', async () => {
    initTestDb();
    const { CompensationQueueService } = getServices();

    const { queueItem } = await CompensationQueueService.submitReceipt({
      sourceType: SOURCE_TYPES.STORE_COMPLAINT,
      sourceId: 'CP20240115001',
      batchNo: 'BATCH20240115001',
      potNo: 'POT001',
      actionType: ACTION_TYPES.RECEIPT_SUBMIT
    });

    const closedItem = await CompensationQueueService.close(
      queueItem.id,
      'operator-001',
      '品控主管',
      '经核查无需处理'
    );

    expect(closedItem.status).toBe(QUEUE_STATUS.CLOSED);
  });

  test('改判操作应记录审计日志且不覆盖原始数据', async () => {
    initTestDb();
    const { CompensationQueueService, AuditService } = getServices();

    const { queueItem } = await CompensationQueueService.submitReceipt({
      sourceType: SOURCE_TYPES.STORE_COMPLAINT,
      sourceId: 'CP20240115001',
      batchNo: 'BATCH20240115001',
      potNo: 'POT001',
      actionType: ACTION_TYPES.RECEIPT_SUBMIT,
      priority: 'normal'
    });

    const oldPriority = queueItem.priority;

    const rejudgedItem = await CompensationQueueService.rejudge(
      queueItem.id,
      { priority: 'high' },
      'operator-001',
      '品控总监',
      '客户投诉升级'
    );

    expect(rejudgedItem.priority).toBe('high');

    const logs = await AuditService.getEntityLogs('compensation_queue', queueItem.id);
    const rejudgeLog = logs.find(l => l.operation_type === 'rejudge');

    expect(rejudgeLog).toBeDefined();

    const diffDetail = JSON.parse(rejudgeLog.diff_detail);
    expect(diffDetail.priority.old).toBe(oldPriority);
    expect(diffDetail.priority.new).toBe('high');
  });
});

describe('补偿队列 - 统计与查询测试', () => {
  test('统计功能应正确返回各状态数量', async () => {
    initTestDb();
    const { CompensationQueueService } = getServices();

    for (let i = 0; i < 5; i++) {
      const { queueItem } = await CompensationQueueService.submitReceipt({
        sourceType: SOURCE_TYPES.STORE_COMPLAINT,
        sourceId: `CP${i}`,
        batchNo: 'BATCH20240115001',
        potNo: 'POT001',
        actionType: ACTION_TYPES.RECEIPT_SUBMIT
      });

      if (i < 2) {
        await CompensationQueueService.markSuccess(queueItem.id, '成功');
      } else if (i < 4) {
        await CompensationQueueService.startProcessing(queueItem.id);
        await CompensationQueueService.markRetry(queueItem.id, '失败', 'ERROR');
      }
    }

    const stats = await CompensationQueueService.getStatistics();

    expect(stats.byStatus[QUEUE_STATUS.SUCCESS]).toBe(2);
    expect(stats.byStatus[QUEUE_STATUS.WAITING_RETRY]).toBe(2);
    expect(stats.byStatus[QUEUE_STATUS.PENDING]).toBe(1);
    expect(stats.total).toBe(5);
  });

  test('死信队列查询应只返回永久失败记录', async () => {
    initTestDb();
    const { CompensationQueueService } = getServices();

    for (let i = 0; i < 3; i++) {
      const { queueItem } = await CompensationQueueService.submitReceipt({
        sourceType: SOURCE_TYPES.STORE_COMPLAINT,
        sourceId: `CP${i}`,
        batchNo: 'BATCH20240115001',
        potNo: 'POT001',
        actionType: ACTION_TYPES.RECEIPT_SUBMIT,
        maxRetryCount: 1,
        retryInterval: 1
      });

      if (i < 2) {
        await CompensationQueueService.startProcessing(queueItem.id);
        await CompensationQueueService.markRetry(queueItem.id, '失败', 'ERROR');
      }
    }

    const deadLetters = await CompensationQueueService.getDeadLetterItems();
    expect(deadLetters.length).toBe(2);

    deadLetters.forEach(item => {
      expect(item.status).toBe(QUEUE_STATUS.PERMANENT_FAILED);
    });
  });
});

describe('补偿队列 - 列表与筛选测试', () => {
  test('按批次号筛选队列项', async () => {
    initTestDb();
    const { CompensationQueueService } = getServices();

    await CompensationQueueService.submitReceipt({
      sourceType: SOURCE_TYPES.STORE_COMPLAINT,
      sourceId: 'CP001',
      batchNo: 'BATCH001',
      potNo: 'POT001',
      actionType: ACTION_TYPES.RECEIPT_SUBMIT
    });

    await CompensationQueueService.submitReceipt({
      sourceType: SOURCE_TYPES.STORE_COMPLAINT,
      sourceId: 'CP002',
      batchNo: 'BATCH002',
      potNo: 'POT001',
      actionType: ACTION_TYPES.RECEIPT_SUBMIT
    });

    const result = await CompensationQueueService.list({ batchNo: 'BATCH001' });
    expect(result.total).toBe(1);
    expect(result.items[0].batch_no).toBe('BATCH001');
  });

  test('分页查询应正确返回', async () => {
    initTestDb();
    const { CompensationQueueService } = getServices();

    for (let i = 0; i < 15; i++) {
      await CompensationQueueService.submitReceipt({
        sourceType: SOURCE_TYPES.STORE_COMPLAINT,
        sourceId: `CP${i}`,
        batchNo: 'BATCH001',
        potNo: 'POT001',
        actionType: ACTION_TYPES.RECEIPT_SUBMIT
      });
    }

    const page1 = await CompensationQueueService.list({ page: 1, pageSize: 10 });
    expect(page1.items.length).toBe(10);
    expect(page1.total).toBe(15);

    const page2 = await CompensationQueueService.list({ page: 2, pageSize: 10 });
    expect(page2.items.length).toBe(5);
  });
});
