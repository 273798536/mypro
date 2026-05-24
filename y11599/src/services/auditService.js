const { v4: uuidv4 } = require('uuid');
const { AuditLog } = require('../models');

function generateLogNo() {
  const timestamp = Date.now().toString(36);
  const random = uuidv4().substring(0, 8);
  return `LOG-${timestamp}-${random}`.toUpperCase();
}

function getChangedFields(beforeData, afterData) {
  const changes = [];
  const before = beforeData || {};
  const after = afterData || {};
  
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  
  for (const key of allKeys) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changes.push({
        field: key,
        before: before[key],
        after: after[key]
      });
    }
  }
  
  return changes;
}

async function createAuditLog(options) {
  const {
    entityType,
    entityId,
    entityNo,
    action,
    operatorId,
    operatorName,
    operatorRole,
    beforeData,
    afterData,
    changeReason,
    ipAddress,
    userAgent,
    requestId,
    idempotentKey,
    batchId,
    isSensitive = false,
    riskLevel = 'LOW',
    remark,
    extra
  } = options;

  const changedFields = getChangedFields(
    typeof beforeData === 'string' ? JSON.parse(beforeData || '{}') : beforeData,
    typeof afterData === 'string' ? JSON.parse(afterData || '{}') : afterData
  );

  return AuditLog.create({
    logNo: generateLogNo(),
    entityType,
    entityId,
    entityNo,
    action,
    operatorId,
    operatorName,
    operatorRole,
    beforeData: typeof beforeData === 'string' ? beforeData : JSON.stringify(beforeData || null),
    afterData: typeof afterData === 'string' ? afterData : JSON.stringify(afterData || null),
    changedFields,
    changeReason,
    ipAddress,
    userAgent,
    requestId,
    idempotentKey,
    batchId,
    isSensitive,
    riskLevel,
    remark,
    extra
  });
}

async function queryAuditLogs(options = {}) {
  const {
    entityType,
    entityId,
    operatorId,
    operatorRole,
    action,
    batchId,
    startTime,
    endTime,
    isSensitive,
    riskLevel,
    page = 1,
    pageSize = 20
  } = options;

  const where = {};
  
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (operatorId) where.operatorId = operatorId;
  if (operatorRole) where.operatorRole = operatorRole;
  if (action) where.action = action;
  if (batchId) where.batchId = batchId;
  if (typeof isSensitive === 'boolean') where.isSensitive = isSensitive;
  if (riskLevel) where.riskLevel = riskLevel;
  
  if (startTime || endTime) {
    where.createdAt = {};
    if (startTime) where.createdAt.$gte = new Date(startTime);
    if (endTime) where.createdAt.$lte = new Date(endTime);
  }

  const { count, rows } = await AuditLog.findAndCountAll({
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

async function getEntityHistory(entityType, entityId) {
  return AuditLog.findAll({
    where: { entityType, entityId },
    order: [['createdAt', 'ASC']]
  });
}

module.exports = {
  createAuditLog,
  queryAuditLogs,
  getEntityHistory,
  getChangedFields,
  generateLogNo
};
