const { v4: uuidv4 } = require('uuid');
const _ = require('lodash');
const db = require('../config/database');
const { OPERATION_TYPES } = require('../constants');

class AuditService {
  static async createLog({
    operationType,
    entityType,
    entityId,
    fieldName = null,
    oldValue = null,
    newValue = null,
    diffDetail = null,
    operatorId = null,
    operatorName = null,
    operationRemark = null
  }) {
    const log = {
      id: uuidv4(),
      operation_type: operationType,
      entity_type: entityType,
      entity_id: entityId,
      field_name: fieldName,
      old_value: oldValue,
      new_value: newValue,
      diff_detail: diffDetail ? JSON.stringify(diffDetail) : null,
      operator_id: operatorId,
      operator_name: operatorName,
      operation_remark: operationRemark,
      created_at: new Date().toISOString()
    };

    await db('audit_logs').insert(log);
    return log;
  }

  static async logCreate(entityType, entityId, newData, operatorId, operatorName, remark = null) {
    return this.createLog({
      operationType: OPERATION_TYPES.CREATE,
      entityType,
      entityId,
      diffDetail: newData,
      operatorId,
      operatorName,
      operationRemark: remark
    });
  }

  static async logUpdate(entityType, entityId, oldData, newData, operatorId, operatorName, remark = null) {
    const diff = {};
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
    
    for (const key of allKeys) {
      if (!_.isEqual(oldData[key], newData[key])) {
        diff[key] = {
          old: oldData[key],
          new: newData[key]
        };
      }
    }

    if (Object.keys(diff).length === 0) {
      return null;
    }

    return this.createLog({
      operationType: OPERATION_TYPES.UPDATE,
      entityType,
      entityId,
      diffDetail: diff,
      operatorId,
      operatorName,
      operationRemark: remark
    });
  }

  static async logStatusChange(entityType, entityId, oldStatus, newStatus, operatorId, operatorName, remark = null) {
    return this.createLog({
      operationType: OPERATION_TYPES.STATUS_CHANGE,
      entityType,
      entityId,
      fieldName: 'status',
      oldValue: oldStatus,
      newValue: newStatus,
      operatorId,
      operatorName,
      operationRemark: remark
    });
  }

  static async logRejudge(entityType, entityId, oldData, newData, operatorId, operatorName, remark = null) {
    const diff = {};
    for (const key of Object.keys(newData)) {
      if (!_.isEqual(oldData[key], newData[key])) {
        diff[key] = {
          old: oldData[key],
          new: newData[key]
        };
      }
    }

    return this.createLog({
      operationType: OPERATION_TYPES.REJUDGE,
      entityType,
      entityId,
      diffDetail: diff,
      operatorId,
      operatorName,
      operationRemark: remark || '改判操作'
    });
  }

  static async getEntityLogs(entityType, entityId, limit = 100) {
    return db('audit_logs')
      .where({ entity_type: entityType, entity_id: entityId })
      .orderBy('created_at', 'desc')
      .limit(limit);
  }

  static async getLogsByOperation(operationType, startTime, endTime, limit = 1000) {
    let query = db('audit_logs').where({ operation_type: operationType });
    
    if (startTime) {
      query = query.where('created_at', '>=', startTime);
    }
    if (endTime) {
      query = query.where('created_at', '<=', endTime);
    }
    
    return query.orderBy('created_at', 'desc').limit(limit);
  }

  static async compareVersions(entityType, entityId, fromLogId, toLogId) {
    const logs = await db('audit_logs')
      .where({ entity_type: entityType, entity_id: entityId })
      .whereIn('id', [fromLogId, toLogId])
      .orderBy('created_at', 'asc');

    if (logs.length < 2) {
      throw new Error('无法找到足够的日志记录进行对比');
    }

    return {
      before: logs[0].diff_detail ? JSON.parse(logs[0].diff_detail) : null,
      after: logs[1].diff_detail ? JSON.parse(logs[1].diff_detail) : null,
      changeTime: logs[1].created_at,
      operator: logs[1].operator_name
    };
  }
}

module.exports = AuditService;
