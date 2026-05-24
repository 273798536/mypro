const { ExceptionRecord, CorrectionHistory, sequelize } = require('../models');
const AsyncTaskService = require('./AsyncTaskService');
const TraceService = require('./TraceService');
const logger = require('../config/logger');

class ExceptionService {
  static async createException(exceptionType, exceptionCode, exceptionMessage, options = {}) {
    const exception = await ExceptionRecord.create({
      exception_type: exceptionType,
      exception_code: exceptionCode,
      exception_message: exceptionMessage,
      record_type: options.recordType,
      record_id: options.recordId,
      batch_no: options.batchNo,
      supplier_code: options.supplierCode,
      exception_data: options.exceptionData ? JSON.stringify(options.exceptionData) : null,
      expected_value: options.expectedValue ? JSON.stringify(options.expectedValue) : null,
      actual_value: options.actualValue ? JSON.stringify(options.actualValue) : null,
      import_record_id: options.importRecordId,
      async_task_id: options.asyncTaskId
    });
    logger.warn(`创建异常记录: ${exception.id} [${exceptionType}] ${exceptionCode}`);
    return exception;
  }

  static async recordQuantityMismatch(record, expectedQty, actualQty, batchNo, supplierCode) {
    return await this.createException('quantity_mismatch', 'QTY_001', '数量不匹配', {
      recordType: record.constructor.name,
      recordId: record.id,
      batchNo,
      supplierCode,
      expectedValue: { quantity: expectedQty },
      actualValue: { quantity: actualQty }
    });
  }

  static async recordPriceMismatch(record, expectedPrice, actualPrice, batchNo, supplierCode) {
    return await this.createException('price_mismatch', 'PRICE_001', '价格不匹配', {
      recordType: record.constructor.name,
      recordId: record.id,
      batchNo,
      supplierCode,
      expectedValue: { price: expectedPrice },
      actualValue: { price: actualPrice }
    });
  }

  static async recordMissingDocument(recordType, recordId, docType, batchNo, supplierCode) {
    return await this.createException('missing_document', 'MISSING_001', `缺少${docType}`, {
      recordType,
      recordId,
      batchNo,
      supplierCode,
      exceptionData: { missingType: docType }
    });
  }

  static async recordDataMismatch(record, fieldName, expected, actual, batchNo, supplierCode) {
    return await this.createException('data_mismatch', 'DATA_001', `字段${fieldName}不匹配`, {
      recordType: record.constructor.name,
      recordId: record.id,
      batchNo,
      supplierCode,
      expectedValue: { [fieldName]: expected },
      actualValue: { [fieldName]: actual },
      exceptionData: { fieldName }
    });
  }

  static async recordDuplicateData(recordType, recordId, duplicateId, batchNo, supplierCode) {
    return await this.createException('duplicate_data', 'DUP_001', '重复数据', {
      recordType,
      recordId,
      batchNo,
      supplierCode,
      exceptionData: { duplicateOfId: duplicateId }
    });
  }

  static async correctException(exceptionId, correction, correctedBy, correctionReason) {
    const exception = await ExceptionRecord.findByPk(exceptionId);
    if (!exception) throw new Error('异常记录不存在');
    const t = await sequelize.transaction();
    try {
      const Model = require('../models')[exception.record_type];
      if (Model) {
        const record = await Model.findByPk(exception.record_id, { transaction: t });
        if (record) {
          for (const [field, newValue] of Object.entries(correction)) {
            const oldValue = record[field];
            await CorrectionHistory.create({
              record_type: exception.record_type,
              record_id: exception.record_id,
              field_name: field,
              old_value: String(oldValue),
              new_value: String(newValue),
              old_raw: exception.actual_value,
              new_raw: JSON.stringify({ [field]: newValue }),
              correction_reason: correctionReason,
              corrected_by: correctedBy,
              correction_method: 'manual',
              related_exception_id: exceptionId,
              difference_summary: `${field}: ${oldValue} -> ${newValue}`
            }, { transaction: t });
            record[field] = newValue;
          }
          await record.save({ transaction: t });
          await TraceService.recordManualCorrection(
            exception.record_type, exception.record_id, Object.keys(correction).join(','), correctedBy
          );
        }
      }
      await exception.update({
        status: 'resolved',
        resolution: correctionReason,
        resolved_at: new Date(),
        resolved_by: correctedBy
      }, { transaction: t });
      await t.commit();
      logger.info(`异常修正完成: ${exceptionId}`);
      return true;
    } catch (error) {
      await t.rollback();
      logger.error(`异常修正失败: ${exceptionId}`, error);
      throw error;
    }
  }

  static async replayException(exceptionId) {
    const exception = await ExceptionRecord.findByPk(exceptionId);
    if (!exception) throw new Error('异常记录不存在');
    let success = false;
    try {
      switch (exception.exception_type) {
        case 'duplicate_data':
          success = await this.replayDuplicateData(exception);
          break;
        case 'parse_error':
          success = await this.replayParseError(exception);
          break;
        default:
          success = await this.retryDataProcessing(exception);
      }
      if (success) {
        await exception.update({
          replay_count: exception.replay_count + 1,
          last_replay_at: new Date(),
          status: 'resolved'
        });
      } else {
        await exception.update({
          replay_count: exception.replay_count + 1,
          last_replay_at: new Date()
        });
      }
      await TraceService.recordReplayException(exceptionId, success);
      return success;
    } catch (error) {
      logger.error(`异常回放失败: ${exceptionId}`, error);
      await exception.update({
        replay_count: exception.replay_count + 1,
        last_replay_at: new Date()
      });
      return false;
    }
  }

  static async replayDuplicateData(exception) {
    const exceptionData = JSON.parse(exception.exception_data || '{}');
    logger.info(`回放重复数据异常: ${exception.id}, 原记录: ${exceptionData.duplicateOfId}`);
    return true;
  }

  static async replayParseError(exception) {
    logger.info(`回放解析错误异常: ${exception.id}`);
    return true;
  }

  static async retryDataProcessing(exception) {
    logger.info(`重试数据处理: ${exception.id}`);
    return true;
  }

  static async getExceptions(filters = {}) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.exceptionType) where.exception_type = filters.exceptionType;
    if (filters.batchNo) where.batch_no = filters.batchNo;
    if (filters.supplierCode) where.supplier_code = filters.supplierCode;
    return await ExceptionRecord.findAll({
      where,
      order: [['created_at', 'DESC']],
      include: [{ all: true, nested: true }]
    });
  }

  static async getCorrectionHistory(recordType, recordId) {
    return await CorrectionHistory.findAll({
      where: { record_type: recordType, record_id: recordId },
      order: [['created_at', 'DESC']]
    });
  }

  static async getExceptionWithDiff(exceptionId) {
    const exception = await ExceptionRecord.findByPk(exceptionId, {
      include: [{ all: true, nested: true }]
    });
    if (!exception) return null;
    const diff = {
      expected: exception.expected_value ? JSON.parse(exception.expected_value) : null,
      actual: exception.actual_value ? JSON.parse(exception.actual_value) : null
    };
    const corrections = await CorrectionHistory.findAll({
      where: { related_exception_id: exceptionId },
      order: [['created_at', 'ASC']]
    });
    return {
      ...exception.toJSON(),
      diff,
      corrections
    };
  }
}

module.exports = ExceptionService;
