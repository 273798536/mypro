const { v4: uuidv4 } = require('uuid');
const { AsyncTask, ChangeOrder, ReferenceRecord, ReviewOpinion, Snapshot } = require('../models');
const auditService = require('./auditService');
const workflowService = require('./workflowService');

const TASK_TYPES = {
  IMPORT_CHANGE_ORDERS: 'IMPORT_CHANGE_ORDERS',
  IMPORT_REVIEWS: 'IMPORT_REVIEWS',
  IMPORT_REFERENCES: 'IMPORT_REFERENCES',
  IMPORT_SNAPSHOTS: 'IMPORT_SNAPSHOTS',
  EXPORT_DATA: 'EXPORT_DATA',
  DESENSITIZE_DATA: 'DESENSITIZE_DATA',
  BATCH_PROCESS: 'BATCH_PROCESS'
};

const TASK_STATUSES = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  WAITING_RETRY: 'WAITING_RETRY',
  WAITING_MANUAL: 'WAITING_MANUAL',
  FAILED_PERMANENT: 'FAILED_PERMANENT',
  COMPLETED: 'COMPLETED'
};

const BATCH_STRATEGIES = {
  IGNORE: 'IGNORE',
  OVERWRITE: 'OVERWRITE',
  APPEND: 'APPEND'
};

function generateTaskId() {
  const timestamp = Date.now().toString(36);
  const random = uuidv4().substring(0, 8);
  return `TASK-${timestamp}-${random}`.toUpperCase();
}

function generateRecordNo(prefix) {
  const timestamp = Date.now().toString(36);
  const random = uuidv4().substring(0, 6);
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
}

async function createTask(taskType, payload, options = {}) {
  const taskId = options.taskId || generateTaskId();
  
  return AsyncTask.create({
    taskId,
    taskType,
    status: TASK_STATUSES.PENDING,
    payload: JSON.stringify(payload),
    batchId: options.batchId,
    totalCount: payload.items?.length || 0,
    createdBy: options.userId,
    createdByName: options.userName,
    maxRetries: options.maxRetries || 3,
    priority: options.priority || 0,
    extra: options.extra
  });
}

async function startTask(taskId) {
  return AsyncTask.update(
    {
      status: TASK_STATUSES.PROCESSING,
      startedAt: new Date(),
      progress: 0
    },
    { where: { taskId } }
  );
}

async function updateTaskProgress(taskId, progress, counts = {}) {
  return AsyncTask.update(
    {
      progress,
      successCount: counts.successCount,
      failedCount: counts.failedCount,
      skippedCount: counts.skippedCount
    },
    { where: { taskId } }
  );
}

async function completeTask(taskId, result) {
  return AsyncTask.update(
    {
      status: TASK_STATUSES.COMPLETED,
      completedAt: new Date(),
      progress: 100,
      result: JSON.stringify(result)
    },
    { where: { taskId } }
  );
}

async function markTaskWaitingRetry(taskId, error, retryDelay = 5000) {
  const task = await AsyncTask.findOne({ where: { taskId } });
  if (!task) return null;

  const newRetryCount = task.retryCount + 1;
  const nextRetryAt = new Date(Date.now() + retryDelay);

  if (newRetryCount >= task.maxRetries) {
    return markTaskFailedPermanent(taskId, error, '达到最大重试次数');
  }

  return AsyncTask.update(
    {
      status: TASK_STATUSES.WAITING_RETRY,
      retryCount: newRetryCount,
      lastRetryAt: new Date(),
      nextRetryAt,
      errorMessage: error.message,
      errorStack: error.stack
    },
    { where: { taskId } }
  );
}

async function markTaskWaitingManual(taskId, error, reason = '需要人工介入') {
  return AsyncTask.update(
    {
      status: TASK_STATUSES.WAITING_MANUAL,
      errorMessage: error?.message || reason,
      errorStack: error?.stack,
      lastRetryAt: new Date()
    },
    { where: { taskId } }
  );
}

async function markTaskFailedPermanent(taskId, error, reason = '永久失败') {
  return AsyncTask.update(
    {
      status: TASK_STATUSES.FAILED_PERMANENT,
      errorMessage: error?.message || reason,
      errorStack: error?.stack,
      completedAt: new Date()
    },
    { where: { taskId } }
  );
}

async function importChangeOrders(items, batchId, batchStrategy = BATCH_STRATEGIES.IGNORE, operator) {
  const results = {
    success: [],
    failed: [],
    skipped: []
  };

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      const existing = await ChangeOrder.findOne({
        where: { orderNo: item.orderNo }
      });

      if (existing) {
        if (batchStrategy === BATCH_STRATEGIES.IGNORE) {
          results.skipped.push({
            orderNo: item.orderNo,
            reason: '已存在，策略为忽略'
          });
          continue;
        } else if (batchStrategy === BATCH_STRATEGIES.OVERWRITE) {
          const beforeData = existing.toJSON();
          await existing.update({
            ...item,
            batchId,
            batchStrategy
          });
          results.success.push({
            orderNo: item.orderNo,
            action: 'overwritten'
          });
          await auditService.createAuditLog({
            entityType: 'CHANGE_ORDER',
            entityId: existing.id,
            entityNo: existing.orderNo,
            action: 'UPDATE',
            operatorId: operator.userId,
            operatorName: operator.userName,
            operatorRole: operator.role,
            beforeData,
            afterData: existing.toJSON(),
            changeReason: '批量导入覆盖',
            batchId,
            isSensitive: item.sensitiveFields?.length > 0
          });
        } else if (batchStrategy === BATCH_STRATEGIES.APPEND) {
          const newOrder = await workflowService.createDraft({
            ...item,
            orderNo: generateRecordNo('CO'),
            batchId,
            batchStrategy
          }, operator);
          results.success.push({
            orderNo: newOrder.orderNo,
            action: 'created'
          });
        }
      } else {
        const newOrder = await workflowService.createDraft({
          ...item,
          batchId,
          batchStrategy
        }, operator);
        results.success.push({
          orderNo: newOrder.orderNo,
          action: 'created'
        });
      }
    } catch (error) {
      results.failed.push({
        orderNo: item.orderNo,
        error: error.message
      });
    }
  }

  return results;
}

async function importReferenceRecords(items, batchId, batchStrategy = BATCH_STRATEGIES.IGNORE, operator) {
  const results = {
    success: [],
    failed: [],
    skipped: []
  };

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      const recordNo = item.recordNo || generateRecordNo('REF');
      
      const existing = await ReferenceRecord.findOne({
        where: { recordNo: item.recordNo }
      });

      if (existing && item.recordNo) {
        if (batchStrategy === BATCH_STRATEGIES.IGNORE) {
          results.skipped.push({
            recordNo: item.recordNo,
            reason: '已存在，策略为忽略'
          });
          continue;
        } else if (batchStrategy === BATCH_STRATEGIES.OVERWRITE) {
          await existing.update({
            ...item,
            batchId,
            batchStrategy
          });
          results.success.push({
            recordNo: item.recordNo,
            action: 'overwritten'
          });
        } else if (batchStrategy === BATCH_STRATEGIES.APPEND) {
          const newRecord = await ReferenceRecord.create({
            ...item,
            recordNo: generateRecordNo('REF'),
            batchId,
            batchStrategy
          });
          results.success.push({
            recordNo: newRecord.recordNo,
            action: 'created'
          });
        }
      } else {
        const newRecord = await ReferenceRecord.create({
          ...item,
          recordNo,
          batchId,
          batchStrategy
        });
        results.success.push({
          recordNo: newRecord.recordNo,
          action: 'created'
        });
      }
    } catch (error) {
      results.failed.push({
        recordNo: item.recordNo,
        error: error.message
      });
    }
  }

  return results;
}

async function importReviewOpinions(items, batchId, batchStrategy = BATCH_STRATEGIES.IGNORE, operator) {
  const results = {
    success: [],
    failed: [],
    skipped: []
  };

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      const newReview = await ReviewOpinion.create({
        ...item,
        reviewerId: item.reviewerId || operator.userId,
        reviewerName: item.reviewerName || operator.userName,
        reviewerRole: item.reviewerRole || operator.role
      });
      results.success.push({
        id: newReview.id,
        orderNo: item.orderNo,
        action: 'created'
      });
    } catch (error) {
      results.failed.push({
        orderNo: item.orderNo,
        error: error.message
      });
    }
  }

  return results;
}

async function importSnapshots(items, batchId, batchStrategy = BATCH_STRATEGIES.IGNORE, operator) {
  const results = {
    success: [],
    failed: [],
    skipped: []
  };

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      const snapshotNo = item.snapshotNo || generateRecordNo('SNP');
      
      const existing = item.fileHash ? await Snapshot.findOne({
        where: { fileHash: item.fileHash }
      }) : null;

      if (existing && batchStrategy === BATCH_STRATEGIES.IGNORE) {
        results.skipped.push({
          snapshotNo: existing.snapshotNo,
          reason: '文件哈希已存在，策略为忽略'
        });
        continue;
      }

      const newSnapshot = await Snapshot.create({
        ...item,
        snapshotNo,
        uploaderId: item.uploaderId || operator.userId,
        uploaderName: item.uploaderName || operator.userName,
        batchId,
        batchStrategy
      });
      results.success.push({
        snapshotNo: newSnapshot.snapshotNo,
        action: 'created'
      });
    } catch (error) {
      results.failed.push({
        fileName: item.fileName,
        error: error.message
      });
    }
  }

  return results;
}

async function processTask(taskId) {
  const task = await AsyncTask.findOne({ where: { taskId } });
  if (!task) {
    throw new Error('任务不存在');
  }

  await startTask(taskId);

  const payload = JSON.parse(task.payload || '{}');
  const operator = {
    userId: task.createdBy,
    userName: task.createdByName,
    role: 'SYSTEM'
  };

  try {
    let results;

    switch (task.taskType) {
      case TASK_TYPES.IMPORT_CHANGE_ORDERS:
        results = await importChangeOrders(
          payload.items,
          task.batchId,
          payload.batchStrategy,
          operator
        );
        break;

      case TASK_TYPES.IMPORT_REFERENCES:
        results = await importReferenceRecords(
          payload.items,
          task.batchId,
          payload.batchStrategy,
          operator
        );
        break;

      case TASK_TYPES.IMPORT_REVIEWS:
        results = await importReviewOpinions(
          payload.items,
          task.batchId,
          payload.batchStrategy,
          operator
        );
        break;

      case TASK_TYPES.IMPORT_SNAPSHOTS:
        results = await importSnapshots(
          payload.items,
          task.batchId,
          payload.batchStrategy,
          operator
        );
        break;

      default:
        throw new Error(`不支持的任务类型: ${task.taskType}`);
    }

    await updateTaskProgress(taskId, 100, {
      successCount: results.success.length,
      failedCount: results.failed.length,
      skippedCount: results.skipped.length
    });

    await completeTask(taskId, results);

    return { success: true, results };
  } catch (error) {
    if (error.message.includes('网络') || error.message.includes('timeout')) {
      await markTaskWaitingRetry(taskId, error);
    } else if (error.message.includes('数据格式') || error.message.includes('权限')) {
      await markTaskWaitingManual(taskId, error);
    } else {
      await markTaskFailedPermanent(taskId, error);
    }
    throw error;
  }
}

async function retryTask(taskId, operator) {
  const task = await AsyncTask.findOne({ where: { taskId } });
  if (!task) {
    throw new Error('任务不存在');
  }

  if (task.status !== TASK_STATUSES.WAITING_RETRY && 
      task.status !== TASK_STATUSES.WAITING_MANUAL &&
      task.status !== TASK_STATUSES.FAILED_PERMANENT) {
    throw new Error('当前任务状态不允许重试');
  }

  await auditService.createAuditLog({
    entityType: 'ASYNC_TASK',
    entityId: task.id,
    entityNo: task.taskId,
    action: 'UPDATE',
    operatorId: operator.userId,
    operatorName: operator.userName,
    operatorRole: operator.role,
    beforeData: task.toJSON(),
    changeReason: '人工重试任务',
    isSensitive: false
  });

  return processTask(taskId);
}

async function getTaskStatus(taskId) {
  return AsyncTask.findOne({ where: { taskId } });
}

async function queryTasks(options = {}) {
  const {
    status,
    taskType,
    batchId,
    createdBy,
    page = 1,
    pageSize = 20
  } = options;

  const where = {};
  if (status) where.status = status;
  if (taskType) where.taskType = taskType;
  if (batchId) where.batchId = batchId;
  if (createdBy) where.createdBy = createdBy;

  const { count, rows } = await AsyncTask.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize
  });

  return {
    total: count,
    page,
    pageSize,
    totalPages: Math.ceil(count / pageSize),
    list: rows
  };
}

module.exports = {
  TASK_TYPES,
  TASK_STATUSES,
  BATCH_STRATEGIES,
  createTask,
  processTask,
  retryTask,
  getTaskStatus,
  queryTasks,
  importChangeOrders,
  importReferenceRecords,
  importReviewOpinions,
  importSnapshots,
  generateTaskId,
  generateRecordNo
};
