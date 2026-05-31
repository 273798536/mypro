const db = require('../models');
const crypto = require('crypto');

const OperationLogger = {
  generateTraceId() {
    return crypto.randomUUID();
  },

  async log(options) {
    const {
      operationType,
      module,
      targetId = null,
      targetNo = null,
      beforeSnapshot = null,
      afterSnapshot = null,
      changeDetails = null,
      oldStatus = null,
      newStatus = null,
      operator,
      clientIp = null,
      userAgent = null,
      success = true,
      errorMessage = null,
      remarks = null,
      traceId = null,
    } = options;

    try {
      await db.OperationLog.create({
        trace_id: traceId || this.generateTraceId(),
        operation_type: operationType,
        module,
        target_id: targetId,
        target_no: targetNo,
        before_snapshot: beforeSnapshot,
        after_snapshot: afterSnapshot,
        change_details: changeDetails,
        old_status: oldStatus,
        new_status: newStatus,
        operator,
        client_ip: clientIp,
        user_agent: userAgent,
        success,
        error_message: errorMessage,
        remarks,
      });
    } catch (err) {
      console.error('操作日志写入失败:', err);
    }
  },

  async logCreate(module, targetId, targetNo, afterSnapshot, operator, traceId) {
    await this.log({
      operationType: 'create',
      module,
      targetId,
      targetNo,
      afterSnapshot,
      operator,
      traceId,
    });
  },

  async logUpdate(module, targetId, targetNo, beforeSnapshot, afterSnapshot, changeDetails, operator, traceId) {
    await this.log({
      operationType: 'update',
      module,
      targetId,
      targetNo,
      beforeSnapshot,
      afterSnapshot,
      changeDetails,
      operator,
      traceId,
    });
  },

  async logStatusChange(module, targetId, targetNo, oldStatus, newStatus, beforeSnapshot, afterSnapshot, operator, traceId, remarks = null) {
    await this.log({
      operationType: 'status_change',
      module,
      targetId,
      targetNo,
      beforeSnapshot,
      afterSnapshot,
      old_status: oldStatus,
      new_status: newStatus,
      operator,
      traceId,
      remarks,
    });
  },

  async logReview(module, targetId, targetNo, reviewResult, beforeSnapshot, afterSnapshot, operator, traceId, remarks = null) {
    await this.log({
      operationType: 'review',
      module,
      targetId,
      targetNo,
      beforeSnapshot,
      afterSnapshot,
      new_status: reviewResult,
      operator,
      traceId,
      remarks,
    });
  },

  async logCorrect(targetType, targetId, targetNo, beforeValue, afterValue, changeSummary, operator, traceId) {
    await this.log({
      operationType: 'correct',
      module: targetType,
      targetId,
      targetNo,
      beforeSnapshot: beforeValue,
      afterSnapshot: afterValue,
      change_details: changeSummary,
      operator,
      traceId,
    });
  },

  async logExport(module, targetId, targetNo, exportDetails, operator, traceId) {
    await this.log({
      operationType: 'export',
      module,
      targetId,
      targetNo,
      change_details: exportDetails,
      operator,
      traceId,
    });
  },
};

module.exports = OperationLogger;
