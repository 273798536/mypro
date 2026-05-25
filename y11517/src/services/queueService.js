const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../database/db');
const config = require('../config/config');
const { createAuditLog } = require('../middleware/auth');

class QueueService {
  constructor() {
    this.processingItems = new Set();
  }

  generateIdempotentKey(workOrderId, itemType, payload) {
    const payloadHash = crypto
      .createHash('md5')
      .update(JSON.stringify(payload))
      .digest('hex');
    return `${workOrderId}:${itemType}:${payloadHash}`;
  }

  async checkIdempotent(idempotentKey) {
    return await db.getSync(
      'SELECT * FROM idempotent_keys WHERE idempotent_key = ?',
      [idempotentKey]
    );
  }

  async enqueue(workOrderId, itemType, payload, userId, ipAddress, options = {}) {
    const { idempotent = true, mergeDuplicates = true } = options;
    
    if (idempotent) {
      const idempotentKey = this.generateIdempotentKey(workOrderId, itemType, payload);
      const existing = await this.checkIdempotent(idempotentKey);
      
      if (existing) {
        const existingItem = await db.getSync(
          'SELECT * FROM queue_items WHERE id = ?',
          [existing.queue_item_id]
        );
        
        if (mergeDuplicates && existingItem && ['pending', 'retry'].includes(existingItem.status)) {
          await this._addHistory(existingItem.id, existingItem.status, existingItem.status, 
            'merge', '重复提交已合并，不创建新队列项', userId);
          return {
            id: existingItem.id,
            merged: true,
            message: '重复提交已合并到现有队列项'
          };
        }
        
        return {
          id: existingItem.id,
          duplicate: true,
          message: '重复提交，返回已存在的队列项'
        };
      }

      const itemId = await this._createQueueItem(workOrderId, itemType, payload, userId, ipAddress);
      
      await db.runSync(
        'INSERT INTO idempotent_keys (idempotent_key, queue_item_id, work_order_id) VALUES (?, ?, ?)',
        [idempotentKey, itemId, workOrderId]
      );
      
      return itemId;
    }

    return await this._createQueueItem(workOrderId, itemType, payload, userId, ipAddress);
  }

  async _createQueueItem(workOrderId, itemType, payload, userId, ipAddress) {
    const itemId = uuidv4();
    const now = new Date().toISOString();

    await db.runSync(`
      INSERT INTO queue_items (id, work_order_id, item_type, payload, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'pending', ?, ?)
    `, [itemId, workOrderId, itemType, JSON.stringify(payload), now, now]);

    await this._addHistory(itemId, null, 'pending', 'enqueue', '任务加入队列', userId);
    
    if (ipAddress) {
      await createAuditLog(userId, 'enqueue', 'queue_items', itemId, { itemType, workOrderId }, ipAddress);
    }

    return itemId;
  }

  async correctAndRetry(queueItemId, correctedPayload, correctionNote, userId) {
    const item = await db.getSync('SELECT * FROM queue_items WHERE id = ?', [queueItemId]);
    
    if (!item) {
      throw new Error('队列项不存在');
    }

    const originalPayload = item.payload;
    const now = new Date().toISOString();

    await db.runSync(`
      INSERT INTO compensation_corrections 
      (queue_item_id, original_payload, corrected_payload, correction_note, corrected_by)
      VALUES (?, ?, ?, ?, ?)
    `, [queueItemId, originalPayload, JSON.stringify(correctedPayload), correctionNote, userId]);

    await db.runSync(`
      UPDATE queue_items 
      SET payload = ?,
          status = 'pending',
          retry_count = 0,
          last_error = NULL,
          error_stack = NULL,
          next_retry_at = NULL,
          updated_at = ?
      WHERE id = ?
    `, [JSON.stringify(correctedPayload), now, queueItemId]);

    await this._addHistory(queueItemId, item.status, 'pending', 'correct', 
      `数据修正: ${correctionNote}`, userId);

    await createAuditLog(userId, 'correct_retry', 'queue_items', queueItemId, { correctionNote }, null);

    return { success: true, message: '数据已修正并重新排队处理' };
  }

  async reprocess(queueItemId, userId) {
    const item = await db.getSync('SELECT * FROM queue_items WHERE id = ?', [queueItemId]);
    
    if (!item) {
      throw new Error('队列项不存在');
    }

    const now = new Date().toISOString();
    
    await db.runSync(`
      UPDATE queue_items 
      SET status = 'pending',
          retry_count = 0,
          last_error = NULL,
          error_stack = NULL,
          next_retry_at = NULL,
          updated_at = ?
      WHERE id = ?
    `, [now, queueItemId]);

    await this._addHistory(queueItemId, item.status, 'pending', 'reprocess', 
      '人工触发重新处理', userId);

    return { success: true, message: '已重新排队处理' };
  }

  async processNext() {
    const now = new Date().toISOString();
    
    const item = await db.getSync(`
      SELECT * FROM queue_items 
      WHERE status IN ('pending', 'retry') 
        AND (next_retry_at IS NULL OR next_retry_at <= ?)
      ORDER BY created_at ASC
      LIMIT 1
    `, [now]);

    if (!item || this.processingItems.has(item.id)) return null;

    this.processingItems.add(item.id);

    await db.runSync(`
      UPDATE queue_items 
      SET status = 'processing', updated_at = ?
      WHERE id = ?
    `, [now, item.id]);

    await this._addHistory(item.id, item.status, 'processing', 'process', '开始处理任务', null);

    return {
      ...item,
      payload: JSON.parse(item.payload)
    };
  }

  async markSuccess(itemId, userId = null) {
    const now = new Date().toISOString();
    const item = await db.getSync('SELECT * FROM queue_items WHERE id = ?', [itemId]);
    
    if (!item) return false;

    await db.runSync(`
      UPDATE queue_items 
      SET status = 'completed', updated_at = ?, completed_at = ?
      WHERE id = ?
    `, [now, now, itemId]);

    await this._addHistory(itemId, 'processing', 'completed', 'success', '任务处理成功', userId);
    this.processingItems.delete(itemId);

    return true;
  }

  async markFailed(itemId, error, userId = null) {
    const now = new Date().toISOString();
    const item = await db.getSync('SELECT * FROM queue_items WHERE id = ?', [itemId]);
    
    if (!item) return false;

    const newRetryCount = item.retry_count + 1;
    const maxRetries = item.max_retries || config.queue.maxRetries;

    if (newRetryCount >= maxRetries) {
      await db.runSync(`
        UPDATE queue_items 
        SET status = 'dead_letter', 
            retry_count = ?, 
            last_error = ?,
            error_stack = ?,
            updated_at = ?
        WHERE id = ?
      `, [newRetryCount, error.message, error.stack, now, itemId]);

      await this._addHistory(itemId, 'processing', 'dead_letter', 'dead_letter', 
        `重试${maxRetries}次失败，进入死信队列: ${error.message}`, userId);
    } else {
      const nextRetryAt = new Date(Date.now() + config.queue.retryDelay * (newRetryCount)).toISOString();
      
      await db.runSync(`
        UPDATE queue_items 
        SET status = 'retry', 
            retry_count = ?, 
            last_error = ?,
            error_stack = ?,
            next_retry_at = ?,
            updated_at = ?
        WHERE id = ?
      `, [newRetryCount, error.message, error.stack, nextRetryAt, now, itemId]);

      await this._addHistory(itemId, 'processing', 'retry', 'retry', 
        `第${newRetryCount}次重试: ${error.message}`, userId);
    }

    this.processingItems.delete(itemId);
    return true;
  }

  async manualHandle(itemId, note, userId) {
    const now = new Date().toISOString();
    const item = await db.getSync('SELECT * FROM queue_items WHERE id = ?', [itemId]);
    
    if (!item) return false;

    await db.runSync(`
      UPDATE queue_items 
      SET status = 'manual', 
          manual_note = ?,
          handled_by = ?,
          updated_at = ?
      WHERE id = ?
    `, [note, userId, now, itemId]);

    await this._addHistory(itemId, item.status, 'manual', 'manual', `人工接管: ${note}`, userId);
    this.processingItems.delete(itemId);

    return true;
  }

  async closeItem(itemId, userId) {
    const now = new Date().toISOString();
    const item = await db.getSync('SELECT * FROM queue_items WHERE id = ?', [itemId]);
    
    if (!item) return false;

    await db.runSync(`
      UPDATE queue_items 
      SET status = 'closed', 
          updated_at = ?
      WHERE id = ?
    `, [now, itemId]);

    await this._addHistory(itemId, item.status, 'closed', 'close', '任务关闭', userId);

    return true;
  }

  async retryDeadLetter(itemId, userId) {
    const now = new Date().toISOString();
    const item = await db.getSync('SELECT * FROM queue_items WHERE id = ?', [itemId]);
    
    if (!item || item.status !== 'dead_letter') return false;

    await db.runSync(`
      UPDATE queue_items 
      SET status = 'retry', 
          retry_count = 0,
          next_retry_at = ?,
          last_error = NULL,
          error_stack = NULL,
          updated_at = ?
      WHERE id = ?
    `, [now, now, itemId]);

    await this._addHistory(itemId, 'dead_letter', 'retry', 'retry_dead_letter', '从死信队列恢复重试', userId);

    return true;
  }

  async getQueueStatus() {
    return await db.allSync(`
      SELECT 
        status,
        COUNT(*) as count,
        MIN(created_at) as oldest_item
      FROM queue_items
      GROUP BY status
      ORDER BY count DESC
    `);
  }

  async getItemsByStatus(status, limit = 100) {
    const items = await db.allSync(`
      SELECT * FROM queue_items 
      WHERE status = ?
      ORDER BY created_at DESC
      LIMIT ?
    `, [status, limit]);
    
    return items.map(item => ({
      ...item,
      payload: JSON.parse(item.payload)
    }));
  }

  async getItemHistory(itemId) {
    return await db.allSync(`
      SELECT qh.*, u.username as performed_by_name
      FROM queue_history qh
      LEFT JOIN users u ON qh.performed_by = u.id
      WHERE qh.queue_item_id = ?
      ORDER BY qh.created_at DESC
    `, [itemId]);
  }

  async getCorrectionHistory(itemId) {
    return await db.allSync(`
      SELECT cc.*, u.username as corrected_by_name
      FROM compensation_corrections cc
      LEFT JOIN users u ON cc.corrected_by = u.id
      WHERE cc.queue_item_id = ?
      ORDER BY cc.created_at DESC
    `, [itemId]);
  }

  async getFailedItemsWithDetails() {
    const items = await db.allSync(`
      SELECT 
        qi.*,
        wo.order_no,
        wo.repair_type,
        wo.shift_record,
        u.username as created_by_name,
        (SELECT COUNT(*) FROM site_photos sp WHERE sp.work_order_id = qi.work_order_id) as photo_count
      FROM queue_items qi
      LEFT JOIN work_orders wo ON qi.work_order_id = wo.id
      LEFT JOIN users u ON wo.created_by = u.id
      WHERE qi.status IN ('retry', 'dead_letter', 'manual')
      ORDER BY qi.updated_at DESC
    `);
    
    return items.map(item => ({
      ...item,
      payload: item.payload ? JSON.parse(item.payload) : null
    }));
  }

  async getRetryClassification() {
    return await db.allSync(`
      SELECT 
        CASE 
          WHEN status = 'retry' THEN '可重试'
          WHEN status = 'dead_letter' THEN '死信队列'
          WHEN status = 'manual' THEN '人工处理中'
          ELSE status
        END as classification,
        COUNT(*) as count,
        item_type,
        MAX(last_error) as sample_error
      FROM queue_items
      WHERE status IN ('retry', 'dead_letter', 'manual')
      GROUP BY classification, item_type
      ORDER BY count DESC
    `);
  }

  async _addHistory(queueItemId, fromStatus, toStatus, action, note, performedBy) {
    await db.runSync(`
      INSERT INTO queue_history (queue_item_id, from_status, to_status, action, note, performed_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [queueItemId, fromStatus, toStatus, action, note, performedBy]);
  }

  startProcessingLoop(handlerFn, intervalMs = 5000) {
    console.log(`队列处理器启动，每${intervalMs}ms检查一次`);
    
    setInterval(async () => {
      let item;
      while ((item = await this.processNext())) {
        try {
          console.log(`处理队列项: ${item.id}`);
          await handlerFn(item);
          await this.markSuccess(item.id);
          console.log(`队列项处理成功: ${item.id}`);
        } catch (error) {
          console.error(`队列项处理失败: ${item.id}`, error.message);
          await this.markFailed(item.id, error);
        }
      }
    }, intervalMs);
  }
}

module.exports = new QueueService();
