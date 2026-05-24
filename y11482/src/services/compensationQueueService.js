const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../config/database');
const AuditService = require('./auditService');
const { 
  QUEUE_STATUS, 
  ACTION_TYPES, 
  SOURCE_TYPES,
  PRIORITY_LEVELS,
  ERROR_CODES 
} = require('../constants');

class CompensationQueueService {
  static generateIdempotentKey(sourceType, sourceId, actionType) {
    const str = `${sourceType}:${sourceId}:${actionType}`;
    return crypto.createHash('md5').update(str).digest('hex');
  }

  static async submitReceipt({
    sourceType,
    sourceId,
    batchNo,
    potNo,
    storeCode = null,
    storeName = null,
    productName = null,
    actionType = ACTION_TYPES.RECEIPT_SUBMIT,
    priority = PRIORITY_LEVELS.NORMAL,
    maxRetryCount = 3,
    retryInterval = 300,
    payload = {},
    operatorId = null,
    operatorName = 'system'
  }) {
    const idempotentKey = this.generateIdempotentKey(sourceType, sourceId, actionType);
    
    const existing = await db('compensation_queue')
      .where({ idempotent_key: idempotentKey })
      .first();

    if (existing) {
      return {
        isDuplicate: true,
        queueItem: existing
      };
    }

    const queueItem = {
      id: uuidv4(),
      idempotent_key: idempotentKey,
      source_type: sourceType,
      source_id: sourceId,
      batch_no: batchNo,
      pot_no: potNo,
      store_code: storeCode,
      store_name: storeName,
      product_name: productName,
      action_type: actionType,
      priority,
      status: QUEUE_STATUS.PENDING,
      retry_count: 0,
      max_retry_count: maxRetryCount,
      retry_interval: retryInterval,
      next_retry_time: null,
      last_retry_time: null,
      last_error: null,
      error_code: null,
      payload: JSON.stringify(payload),
      result: null,
      created_by: operatorId,
      updated_by: operatorId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await db('compensation_queue').insert(queueItem);

    await AuditService.logCreate(
      'compensation_queue',
      queueItem.id,
      queueItem,
      operatorId,
      operatorName,
      '提交回执进入补偿队列'
    );

    return {
      isDuplicate: false,
      queueItem: await this.getById(queueItem.id)
    };
  }

  static async getById(id) {
    const item = await db('compensation_queue').where({ id }).first();
    if (item && item.payload) {
      item.payload = JSON.parse(item.payload);
    }
    return item;
  }

  static async getByIdempotentKey(idempotentKey) {
    const item = await db('compensation_queue').where({ idempotent_key: idempotentKey }).first();
    if (item && item.payload) {
      item.payload = JSON.parse(item.payload);
    }
    return item;
  }

  static async getPendingItems(limit = 100) {
    const items = await db('compensation_queue')
      .whereIn('status', [QUEUE_STATUS.PENDING, QUEUE_STATUS.PROCESSING])
      .orderByRaw(`
        CASE priority 
          WHEN 'high' THEN 1 
          WHEN 'normal' THEN 2 
          WHEN 'low' THEN 3 
        END ASC
      `)
      .orderBy('created_at', 'asc')
      .limit(limit);

    return items.map(item => ({
      ...item,
      payload: item.payload ? JSON.parse(item.payload) : null
    }));
  }

  static async getRetryableItems(limit = 100) {
    const now = new Date().toISOString();
    const items = await db('compensation_queue')
      .where('status', QUEUE_STATUS.WAITING_RETRY)
      .where('next_retry_time', '<=', now)
      .orderByRaw(`
        CASE priority 
          WHEN 'high' THEN 1 
          WHEN 'normal' THEN 2 
          WHEN 'low' THEN 3 
        END ASC
      `)
      .orderBy('next_retry_time', 'asc')
      .limit(limit);

    return items.map(item => ({
      ...item,
      payload: item.payload ? JSON.parse(item.payload) : null
    }));
  }

  static async startProcessing(id, operatorId = null, operatorName = 'system') {
    const item = await this.getById(id);
    if (!item) {
      throw new Error('队列项不存在');
    }

    const oldStatus = item.status;

    await db('compensation_queue')
      .where({ id })
      .update({
        status: QUEUE_STATUS.PROCESSING,
        last_retry_time: new Date().toISOString(),
        updated_by: operatorId,
        updated_at: new Date().toISOString()
      });

    await AuditService.logStatusChange(
      'compensation_queue',
      id,
      oldStatus,
      QUEUE_STATUS.PROCESSING,
      operatorId,
      operatorName,
      '开始处理'
    );

    return this.getById(id);
  }

  static async markSuccess(id, result, operatorId = null, operatorName = 'system') {
    const item = await this.getById(id);
    if (!item) {
      throw new Error('队列项不存在');
    }

    const oldStatus = item.status;

    await db('compensation_queue')
      .where({ id })
      .update({
        status: QUEUE_STATUS.SUCCESS,
        result: typeof result === 'string' ? result : JSON.stringify(result),
        completed_at: new Date().toISOString(),
        updated_by: operatorId,
        updated_at: new Date().toISOString()
      });

    await AuditService.logStatusChange(
      'compensation_queue',
      id,
      oldStatus,
      QUEUE_STATUS.SUCCESS,
      operatorId,
      operatorName,
      '处理成功'
    );

    return this.getById(id);
  }

  static async markRetry(id, error, errorCode = ERROR_CODES.UNKNOWN_ERROR, operatorId = null, operatorName = 'system') {
    const item = await this.getById(id);
    if (!item) {
      throw new Error('队列项不存在');
    }

    const newRetryCount = item.retry_count + 1;
    const oldStatus = item.status;

    if (newRetryCount >= item.max_retry_count) {
      return this.markPermanentFailed(id, error, errorCode, operatorId, operatorName);
    }

    const nextRetryTime = new Date();
    nextRetryTime.setSeconds(nextRetryTime.getSeconds() + item.retry_interval);

    await db('compensation_queue')
      .where({ id })
      .update({
        status: QUEUE_STATUS.WAITING_RETRY,
        retry_count: newRetryCount,
        last_error: error,
        error_code: errorCode,
        next_retry_time: nextRetryTime.toISOString(),
        updated_by: operatorId,
        updated_at: new Date().toISOString()
      });

    await AuditService.logStatusChange(
      'compensation_queue',
      id,
      oldStatus,
      QUEUE_STATUS.WAITING_RETRY,
      operatorId,
      operatorName,
      `处理失败，等待第 ${newRetryCount} 次重试。错误: ${error}`
    );

    return this.getById(id);
  }

  static async markPermanentFailed(id, error, errorCode = ERROR_CODES.UNKNOWN_ERROR, operatorId = null, operatorName = 'system') {
    const item = await this.getById(id);
    if (!item) {
      throw new Error('队列项不存在');
    }

    const oldStatus = item.status;
    const finalRetryCount = item.retry_count + 1;

    await db('compensation_queue')
      .where({ id })
      .update({
        status: QUEUE_STATUS.PERMANENT_FAILED,
        retry_count: finalRetryCount,
        last_error: error,
        error_code: errorCode,
        updated_by: operatorId,
        updated_at: new Date().toISOString()
      });

    await AuditService.logStatusChange(
      'compensation_queue',
      id,
      oldStatus,
      QUEUE_STATUS.PERMANENT_FAILED,
      operatorId,
      operatorName,
      `永久失败（共重试 ${finalRetryCount} 次）: ${error}`
    );

    return this.getById(id);
  }

  static async markManualIntervention(id, operatorId, operatorName, remark = null) {
    const item = await this.getById(id);
    if (!item) {
      throw new Error('队列项不存在');
    }

    const oldStatus = item.status;

    await db('compensation_queue')
      .where({ id })
      .update({
        status: QUEUE_STATUS.WAITING_MANUAL,
        handled_by: operatorId,
        handled_at: new Date().toISOString(),
        updated_by: operatorId,
        updated_at: new Date().toISOString()
      });

    await AuditService.logStatusChange(
      'compensation_queue',
      id,
      oldStatus,
      QUEUE_STATUS.WAITING_MANUAL,
      operatorId,
      operatorName,
      remark || '转人工处理'
    );

    return this.getById(id);
  }

  static async manualCompensate(id, result, operatorId, operatorName, remark = null) {
    const item = await this.getById(id);
    if (!item) {
      throw new Error('队列项不存在');
    }

    const oldStatus = item.status;

    await db('compensation_queue')
      .where({ id })
      .update({
        status: QUEUE_STATUS.COMPENSATED,
        result: typeof result === 'string' ? result : JSON.stringify(result),
        handled_by: operatorId,
        handled_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        updated_by: operatorId,
        updated_at: new Date().toISOString()
      });

    await AuditService.logStatusChange(
      'compensation_queue',
      id,
      oldStatus,
      QUEUE_STATUS.COMPENSATED,
      operatorId,
      operatorName,
      remark || '人工补偿完成'
    );

    return this.getById(id);
  }

  static async close(id, operatorId, operatorName, remark = null) {
    const item = await this.getById(id);
    if (!item) {
      throw new Error('队列项不存在');
    }

    const oldStatus = item.status;

    await db('compensation_queue')
      .where({ id })
      .update({
        status: QUEUE_STATUS.CLOSED,
        updated_by: operatorId,
        updated_at: new Date().toISOString()
      });

    await AuditService.logStatusChange(
      'compensation_queue',
      id,
      oldStatus,
      QUEUE_STATUS.CLOSED,
      operatorId,
      operatorName,
      remark || '关闭补偿项'
    );

    return this.getById(id);
  }

  static async rejudge(id, updates, operatorId, operatorName, remark = null) {
    const item = await this.getById(id);
    if (!item) {
      throw new Error('队列项不存在');
    }

    const allowedFields = ['priority', 'max_retry_count', 'retry_interval', 'action_type', 'product_name', 'store_name'];
    const filteredUpdates = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    const oldData = { ...item };
    const newData = { ...item, ...filteredUpdates };

    if (Object.keys(filteredUpdates).length === 0) {
      return item;
    }

    await db('compensation_queue')
      .where({ id })
      .update({
        ...filteredUpdates,
        updated_by: operatorId,
        updated_at: new Date().toISOString()
      });

    await AuditService.logRejudge(
      'compensation_queue',
      id,
      oldData,
      newData,
      operatorId,
      operatorName,
      remark
    );

    return this.getById(id);
  }

  static async getStatistics() {
    const stats = await db('compensation_queue')
      .select('status')
      .count('id as count')
      .groupBy('status');

    const result = {};
    Object.values(QUEUE_STATUS).forEach(status => {
      result[status] = 0;
    });

    stats.forEach(s => {
      result[s.status] = s.count;
    });

    const priorityStats = await db('compensation_queue')
      .select('priority')
      .count('id as count')
      .groupBy('priority');

    const priorityResult = {};
    Object.values(PRIORITY_LEVELS).forEach(level => {
      priorityResult[level] = 0;
    });

    priorityStats.forEach(s => {
      priorityResult[s.priority] = s.count;
    });

    return {
      byStatus: result,
      byPriority: priorityResult,
      total: await db('compensation_queue').count('id as count').first().then(r => r.count)
    };
  }

  static async getDeadLetterItems(startTime = null, endTime = null, limit = 1000) {
    let query = db('compensation_queue')
      .where('status', QUEUE_STATUS.PERMANENT_FAILED);

    if (startTime) {
      query = query.where('updated_at', '>=', startTime);
    }
    if (endTime) {
      query = query.where('updated_at', '<=', endTime);
    }

    const items = await query.orderBy('updated_at', 'desc').limit(limit);
    
    return items.map(item => ({
      ...item,
      payload: item.payload ? JSON.parse(item.payload) : null
    }));
  }

  static async list(params = {}) {
    const { 
      status, 
      batchNo, 
      potNo, 
      storeCode, 
      sourceType,
      startTime,
      endTime,
      page = 1,
      pageSize = 20
    } = params;

    let query = db('compensation_queue').select();

    if (status) {
      query = query.where('status', status);
    }
    if (batchNo) {
      query = query.where('batch_no', batchNo);
    }
    if (potNo) {
      query = query.where('pot_no', potNo);
    }
    if (storeCode) {
      query = query.where('store_code', storeCode);
    }
    if (sourceType) {
      query = query.where('source_type', sourceType);
    }
    if (startTime) {
      query = query.where('created_at', '>=', startTime);
    }
    if (endTime) {
      query = query.where('created_at', '<=', endTime);
    }

    const total = await query.clone().count('id as count').first().then(r => r.count);
    const items = await query
      .orderBy('created_at', 'desc')
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    return {
      items: items.map(item => ({
        ...item,
        payload: item.payload ? JSON.parse(item.payload) : null
      })),
      total,
      page,
      pageSize
    };
  }
}

module.exports = CompensationQueueService;
