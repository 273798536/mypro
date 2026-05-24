const { v4: uuidv4 } = require('uuid');
const {
  retryQueueDAO,
  sampleTransferOrderDAO,
  sizeModificationOpinionDAO,
  fabricInventoryDAO,
  smsScreenshotDAO,
  manualOpinionDAO,
  compensationRecordDAO,
  deadLetterDAO,
  db
} = require('../dao');

class RetryQueueService {
  async submitReceipt(data) {
    const { hotlineOrderId, styleCode, transferOrders, sizeOpinions, fabricRecords, operator } = data;
    
    const queueId = await retryQueueDAO.enqueue({
      hotline_order_id: hotlineOrderId,
      style_code: styleCode,
      source_system: 'hotline'
    });

    await db.beginTransaction();
    try {
      if (transferOrders && transferOrders.length > 0) {
        for (const order of transferOrders) {
          await sampleTransferOrderDAO.createWithVersion({
            ...order,
            queue_id: queueId,
            style_code: order.style_code || styleCode
          }, operator);
        }
      }

      if (sizeOpinions && sizeOpinions.length > 0) {
        for (const opinion of sizeOpinions) {
          await sizeModificationOpinionDAO.createWithVersion({
            ...opinion,
            queue_id: queueId,
            style_code: opinion.style_code || styleCode
          }, operator);
        }
      }

      if (fabricRecords && fabricRecords.length > 0) {
        for (const record of fabricRecords) {
          await fabricInventoryDAO.createWithVersion({
            ...record,
            queue_id: queueId,
            style_code: record.style_code || styleCode
          }, operator);
        }
      }

      await retryQueueDAO.update(queueId, {
        status: 'processing',
        updated_at: new Date().toISOString()
      });

      await db.commit();
      return queueId;
    } catch (err) {
      await db.rollback();
      throw err;
    }
  }

  async processQueue(limit = 10) {
    const items = await retryQueueDAO.getPendingForRetry(limit);
    const results = [];

    for (const item of items) {
      try {
        const result = await this.processSingleItem(item);
        results.push(result);
      } catch (error) {
        results.push({
          queueId: item.id,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  async processSingleItem(queueItem) {
    const classification = this.classifyRetry(queueItem);
    
    try {
      await this.validateAndConsolidate(queueItem.id);
      
      await this.applyCompensation(queueItem.id);
      
      await retryQueueDAO.markAsSuccess(queueItem.id);
      
      return {
        queueId: queueItem.id,
        success: true,
        classification
      };
    } catch (error) {
      if (queueItem.retry_count + 1 >= queueItem.max_retries) {
        await deadLetterDAO.archive(
          queueItem.id,
          queueItem.style_code,
          error.type || 'unknown',
          error.message,
          queueItem.retry_count + 1
        );
        await retryQueueDAO.markAsManual(queueItem.id, 'system');
      } else {
        await retryQueueDAO.markForRetry(
          queueItem.id,
          error.message,
          error.type || 'unknown',
          this.getRetryDelay(queueItem.retry_count)
        );
      }
      
      throw error;
    }
  }

  classifyRetry(queueItem) {
    const errorType = queueItem.error_type;
    
    const classifications = {
      'missing_field': 'data_correction',
      'cross_day': 'time_cross_day_adjustment',
      'name_change': 'reference_update',
      'amount_conflict': 'reconciliation_needed',
      'quantity_conflict': 'inventory_adjustment'
    };
    
    return classifications[errorType] || 'general_retry';
  }

  getRetryDelay(retryCount) {
    const delays = [5, 15, 30, 60];
    return delays[Math.min(retryCount, delays.length - 1)];
  }

  async validateAndConsolidate(queueId) {
    const transferOrders = await sampleTransferOrderDAO.getByQueueId(queueId);
    const sizeOpinions = await sizeModificationOpinionDAO.getByQueueId(queueId);
    const fabricRecords = await fabricInventoryDAO.getByQueueId(queueId);

    const issues = [];

    for (const order of transferOrders) {
      if (!order.order_no || !order.style_code) {
        issues.push({ type: 'missing_field', record: order });
      }
    }

    for (const opinion of sizeOpinions) {
      if (!opinion.size || !opinion.after_value) {
        issues.push({ type: 'missing_field', record: opinion });
      }
    }

    for (const fabric of fabricRecords) {
      if (!fabric.fabric_code || !fabric.quantity) {
        issues.push({ type: 'missing_field', record: fabric });
      }
    }

    if (issues.length > 0) {
      const error = new Error(`Validation failed with ${issues.length} issues`);
      error.type = 'validation_error';
      error.issues = issues;
      throw error;
    }

    return true;
  }

  async applyCompensation(queueId) {
    const fabricRecords = await fabricInventoryDAO.getByQueueId(queueId);
    
    const fabricSummary = {};
    for (const fabric of fabricRecords) {
      const key = `${fabric.fabric_code}_${fabric.color}`;
      if (!fabricSummary[key]) {
        fabricSummary[key] = { in: 0, out: 0 };
      }
      if (fabric.in_out_type === 'in') {
        fabricSummary[key].in += parseFloat(fabric.quantity);
      } else {
        fabricSummary[key].out += parseFloat(fabric.quantity);
      }
    }

    for (const [key, summary] of Object.entries(fabricSummary)) {
      const diff = summary.out - summary.in;
      if (diff > 0) {
        const [fabricCode, color] = key.split('_');
        await compensationRecordDAO.create({
          id: uuidv4(),
          queue_id: queueId,
          compensation_type: 'fabric_shortage',
          quantity: diff,
          description: `面料 ${fabricCode}(${color}) 超领补偿: ${diff}`
        });
      }
    }

    return true;
  }

  async manualTakeover(queueId, operator) {
    await retryQueueDAO.markAsManual(queueId, operator);
    
    await manualOpinionDAO.create({
      id: uuidv4(),
      queue_id: queueId,
      operator: operator,
      opinion_type: 'takeover',
      content: '人工接管处理',
      operation_type: 'status_change'
    });

    return true;
  }

  async closeQueue(queueId, operator, reason) {
    await retryQueueDAO.markAsClosed(queueId);
    
    await manualOpinionDAO.create({
      id: uuidv4(),
      queue_id: queueId,
      operator: operator,
      opinion_type: 'close',
      content: reason || '正常关闭',
      operation_type: 'status_change'
    });

    return true;
  }

  async getQueueDetails(queueId) {
    const queue = await retryQueueDAO.getById(queueId);
    if (!queue) return null;

    const [transferOrders, sizeOpinions, fabricRecords, smsScreenshots, manualOpinions, compensations] = await Promise.all([
      sampleTransferOrderDAO.getByQueueId(queueId),
      sizeModificationOpinionDAO.getByQueueId(queueId),
      fabricInventoryDAO.getByQueueId(queueId),
      smsScreenshotDAO.getByQueueId(queueId),
      manualOpinionDAO.getByQueueId(queueId),
      compensationRecordDAO.getByQueueId(queueId)
    ]);

    return {
      queue,
      transferOrders,
      sizeOpinions,
      fabricRecords,
      smsScreenshots,
      manualOpinions,
      compensations
    };
  }

  async getStatistics() {
    const stats = await retryQueueDAO.getStats();
    const deadLetters = await deadLetterDAO.getRecoverable();
    
    return {
      byStatus: stats.reduce((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + s.count;
        return acc;
      }, {}),
      deadLetterCount: deadLetters.length,
      recoverableCount: deadLetters.filter(d => d.can_be_recovered).length
    };
  }
}

module.exports = new RetryQueueService();
