const ReturnBatch = require('../models/ReturnBatch');
const ReturnApplication = require('../models/ReturnApplication');
const StatusHistory = require('../models/StatusHistory');
const FailedRecord = require('../models/FailedRecord');
const { RETURN_STATUSES, OPERATION_TYPES, generateSignature } = require('../utils/common');

const STATE_TRANSITIONS = {
  [RETURN_STATUSES.CREATED]: [
    RETURN_STATUSES.ATTACHMENT_UPLOADED,
    RETURN_STATUSES.CANCELED
  ],
  [RETURN_STATUSES.ATTACHMENT_UPLOADED]: [
    RETURN_STATUSES.INSPECTED,
    RETURN_STATUSES.CANCELED
  ],
  [RETURN_STATUSES.INSPECTED]: [
    RETURN_STATUSES.REVIEWED,
    RETURN_STATUSES.CANCELED
  ],
  [RETURN_STATUSES.REVIEWED]: [
    RETURN_STATUSES.FROZEN,
    RETURN_STATUSES.SETTLED,
    RETURN_STATUSES.ARCHIVED
  ],
  [RETURN_STATUSES.FROZEN]: [
    RETURN_STATUSES.REVIEWED,
    RETURN_STATUSES.SETTLED,
    RETURN_STATUSES.ARCHIVED
  ],
  [RETURN_STATUSES.SETTLED]: [
    RETURN_STATUSES.ARCHIVED
  ]
};

class StateMachineService {
  static canTransition(fromStatus, toStatus) {
    const allowedTransitions = STATE_TRANSITIONS[fromStatus];
    return allowedTransitions && allowedTransitions.includes(toStatus);
  }

  static async transition(batchId, toStatus, operator, operationType, reason = null) {
    try {
      const batch = await ReturnBatch.findById(batchId);
      if (!batch) {
        throw new Error('批次不存在');
      }

      if (!this.canTransition(batch.status, toStatus)) {
        throw new Error(`不允许从 ${batch.status} 转换到 ${toStatus}`);
      }

      const result = await ReturnBatch.updateStatus(batchId, toStatus, operator, reason);

      await StatusHistory.create({
        batch_id: batchId,
        application_id: batch.application_id,
        from_status: batch.status,
        to_status: toStatus,
        operation_type: operationType,
        operator: operator,
        reason: reason
      });

      return {
        success: true,
        batch_id: batchId,
        from_status: batch.status,
        to_status: toStatus
      };
    } catch (error) {
      await FailedRecord.create({
        record_type: 'STATE_TRANSITION',
        record_data: { batchId, toStatus, operator, operationType, reason },
        error_message: error.message,
        source: 'StateMachineService.transition'
      });
      throw error;
    }
  }

  static async createBatch(applicationId, batchData, operator) {
    try {
      const existingBatch = await ReturnBatch.findByBatchNo(batchData.batch_no);
      if (existingBatch) {
        const reentryType = await this._determineReentryType(existingBatch, batchData);
        
        await StatusHistory.create({
          batch_id: existingBatch.id,
          application_id: existingBatch.application_id,
          from_status: existingBatch.status,
          to_status: existingBatch.status,
          operation_type: OPERATION_TYPES.REENTRY,
          operator: operator,
          reason: `重复导入，处理方式: ${reentryType}`,
          is_reentry: 1,
          reentry_type: reentryType
        });

        if (reentryType === 'IGNORE') {
          return {
            success: true,
            batch_id: existingBatch.id,
            is_reentry: true,
            reentry_type: 'IGNORE',
            message: '批次已存在，已忽略重复导入',
            previous_data: {
              quantity: existingBatch.quantity,
              unit_price: existingBatch.unit_price,
              amount: existingBatch.amount
            }
          };
        }

        const newAmount = batchData.quantity * batchData.unit_price;
        const previousData = {
          quantity: existingBatch.quantity,
          unit_price: existingBatch.unit_price,
          amount: existingBatch.amount
        };

        await ReturnBatch.update(existingBatch.id, {
          product_code: batchData.product_code,
          product_name: batchData.product_name,
          quantity: batchData.quantity,
          unit_price: batchData.unit_price,
          amount: newAmount
        });

        await this._updateApplicationTotals(existingBatch.application_id);

        return {
          success: true,
          batch_id: existingBatch.id,
          is_reentry: true,
          reentry_type: 'OVERWRITE',
          message: '批次已存在，已覆盖原有数据',
          previous_data: previousData,
          new_data: {
            quantity: batchData.quantity,
            unit_price: batchData.unit_price,
            amount: newAmount
          }
        };
      }

      const application = await ReturnApplication.findById(applicationId);
      if (!application) {
        throw new Error('退供申请不存在');
      }

      const batch = await ReturnBatch.create({
        application_id: applicationId,
        ...batchData
      });

      await StatusHistory.create({
        batch_id: batch.id,
        application_id: applicationId,
        from_status: null,
        to_status: RETURN_STATUSES.CREATED,
        operation_type: OPERATION_TYPES.CREATE_BATCH,
        operator: operator
      });

      await this._updateApplicationTotals(applicationId);

      return {
        success: true,
        batch_id: batch.id,
        is_reentry: false
      };
    } catch (error) {
      await FailedRecord.create({
        record_type: 'CREATE_BATCH',
        record_data: { applicationId, batchData, operator },
        error_message: error.message,
        source: 'StateMachineService.createBatch'
      });
      throw error;
    }
  }

  static async uploadAttachment(batchId, operator) {
    return this.transition(
      batchId,
      RETURN_STATUSES.ATTACHMENT_UPLOADED,
      operator,
      OPERATION_TYPES.UPLOAD_ATTACHMENT,
      '附件上传完成'
    );
  }

  static async qualityInspection(batchId, qualityStatus, inspectedBy, manualReason = null) {
    try {
      const batch = await ReturnBatch.findById(batchId);
      if (!batch) {
        throw new Error('批次不存在');
      }

      await ReturnBatch.update(batchId, {
        quality_status: qualityStatus,
        inspected_by: inspectedBy,
        manual_reason: manualReason
      });

      return this.transition(
        batchId,
        RETURN_STATUSES.INSPECTED,
        inspectedBy,
        OPERATION_TYPES.QUALITY_INSPECTION,
        `质检结果: ${qualityStatus}`
      );
    } catch (error) {
      await FailedRecord.create({
        record_type: 'QUALITY_INSPECTION',
        record_data: { batchId, qualityStatus, inspectedBy, manualReason },
        error_message: error.message,
        source: 'StateMachineService.qualityInspection'
      });
      throw error;
    }
  }

  static async review(batchId, operator, manualReason = null) {
    try {
      if (manualReason) {
        await ReturnBatch.update(batchId, { manual_reason: manualReason });
      }

      return this.transition(
        batchId,
        RETURN_STATUSES.REVIEWED,
        operator,
        OPERATION_TYPES.REVIEW,
        manualReason
      );
    } catch (error) {
      await FailedRecord.create({
        record_type: 'REVIEW',
        record_data: { batchId, operator, manualReason },
        error_message: error.message,
        source: 'StateMachineService.review'
      });
      throw error;
    }
  }

  static async reviewRevise(batchId, operator, manualReason) {
    try {
      const batch = await ReturnBatch.findById(batchId);
      if (!batch) {
        throw new Error('批次不存在');
      }

      await ReturnBatch.update(batchId, { manual_reason: manualReason });

      await StatusHistory.create({
        batch_id: batchId,
        application_id: batch.application_id,
        from_status: batch.status,
        to_status: batch.status,
        operation_type: OPERATION_TYPES.REVIEW_REVISE,
        operator: operator,
        reason: manualReason
      });

      return {
        success: true,
        batch_id: batchId,
        message: '复核改判完成'
      };
    } catch (error) {
      await FailedRecord.create({
        record_type: 'REVIEW_REVISE',
        record_data: { batchId, operator, manualReason },
        error_message: error.message,
        source: 'StateMachineService.reviewRevise'
      });
      throw error;
    }
  }

  static async freeze(batchId, freezeReason, operator) {
    try {
      const batch = await ReturnBatch.findById(batchId);
      if (!batch) {
        throw new Error('批次不存在');
      }

      const result = await ReturnBatch.freeze(batchId, freezeReason, operator);

      await StatusHistory.create({
        batch_id: batchId,
        application_id: batch.application_id,
        from_status: batch.status,
        to_status: RETURN_STATUSES.FROZEN,
        operation_type: OPERATION_TYPES.FREEZE,
        operator: operator,
        reason: freezeReason
      });

      return {
        success: true,
        batch_id: batchId,
        from_status: batch.status,
        to_status: RETURN_STATUSES.FROZEN
      };
    } catch (error) {
      await FailedRecord.create({
        record_type: 'FREEZE',
        record_data: { batchId, freezeReason, operator },
        error_message: error.message,
        source: 'StateMachineService.freeze'
      });
      throw error;
    }
  }

  static async unfreeze(batchId, operator) {
    try {
      const batch = await ReturnBatch.findById(batchId);
      if (!batch) {
        throw new Error('批次不存在');
      }

      const result = await ReturnBatch.unfreeze(batchId, operator);

      await StatusHistory.create({
        batch_id: batchId,
        application_id: batch.application_id,
        from_status: batch.status,
        to_status: RETURN_STATUSES.REVIEWED,
        operation_type: OPERATION_TYPES.UNFREEZE,
        operator: operator
      });

      return {
        success: true,
        batch_id: batchId,
        from_status: batch.status,
        to_status: RETURN_STATUSES.REVIEWED
      };
    } catch (error) {
      await FailedRecord.create({
        record_type: 'UNFREEZE',
        record_data: { batchId, operator },
        error_message: error.message,
        source: 'StateMachineService.unfreeze'
      });
      throw error;
    }
  }

  static async settle(batchId, operator) {
    return this.transition(
      batchId,
      RETURN_STATUSES.SETTLED,
      operator,
      OPERATION_TYPES.SETTLE,
      '结算完成'
    );
  }

  static async archive(batchId, operator) {
    return this.transition(
      batchId,
      RETURN_STATUSES.ARCHIVED,
      operator,
      OPERATION_TYPES.ARCHIVE,
      '已归档'
    );
  }

  static async _determineReentryType(existingBatch, newBatchData) {
    const existingSig = generateSignature({
      product_code: existingBatch.product_code,
      quantity: existingBatch.quantity,
      unit_price: existingBatch.unit_price
    });

    const newSig = generateSignature({
      product_code: newBatchData.product_code,
      quantity: newBatchData.quantity,
      unit_price: newBatchData.unit_price
    });

    return existingSig === newSig ? 'IGNORE' : 'OVERWRITE';
  }

  static async _updateApplicationTotals(applicationId) {
    const batches = await ReturnBatch.findByApplicationId(applicationId);
    const totalQuantity = batches.reduce((sum, b) => sum + b.quantity, 0);
    const totalAmount = batches.reduce((sum, b) => sum + b.amount, 0);

    await ReturnApplication.update(applicationId, {
      total_quantity: totalQuantity,
      total_amount: totalAmount
    });
  }
}

module.exports = StateMachineService;
