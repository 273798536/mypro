const { OperationLog, OPERATION_TYPES } = require('../models/OperationLog');
const _ = require('lodash');

const compareObjects = (obj1, obj2) => {
  const changes = [];
  const allKeys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);

  allKeys.forEach(key => {
    const val1 = obj1?.[key];
    const val2 = obj2?.[key];
    
    if (!_.isEqual(val1, val2)) {
      changes.push({
        field: key,
        oldValue: val1,
        newValue: val2
      });
    }
  });

  return changes;
};

const logOperation = async (options) => {
  const {
    operationType,
    operator,
    targetType,
    targetId,
    targetNo,
    beforeData,
    afterData,
    changeReason,
    ip,
    userAgent,
    success = true,
    errorMessage
  } = options;

  const changes = compareObjects(beforeData, afterData);

  const log = new OperationLog({
    operationType,
    operator: operator._id,
    operatorName: operator.name,
    operatorRole: operator.role,
    targetType,
    targetId,
    targetNo,
    beforeData,
    afterData,
    changes,
    changeReason,
    ip,
    userAgent,
    success,
    errorMessage
  });

  await log.save();
  return log;
};

const getAuditTrail = async (targetType, targetId, page = 1, limit = 50) => {
  const skip = (page - 1) * limit;

  const logs = await OperationLog.find({
    targetType,
    targetId
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await OperationLog.countDocuments({ targetType, targetId });

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

const getChangeDiff = (logId) => {
  return OperationLog.findById(logId);
};

const compareVersions = (version1, version2, fields = []) => {
  const changes = [];
  const keysToCompare = fields.length > 0 ? fields : [...new Set([...Object.keys(version1), ...Object.keys(version2)])];

  keysToCompare.forEach(key => {
    const val1 = version1[key];
    const val2 = version2[key];
    
    if (!_.isEqual(val1, val2)) {
      changes.push({
        field: key,
        oldValue: val1,
        newValue: val2
      });
    }
  });

  return changes;
};

const logLogin = async (user, ip, userAgent, success = true, errorMessage = null) => {
  return logOperation({
    operationType: OPERATION_TYPES.LOGIN,
    operator: user,
    targetType: 'user',
    targetId: user._id,
    targetNo: user.username,
    ip,
    userAgent,
    success,
    errorMessage
  });
};

const logExport = async (user, targetType, filters, ip) => {
  return logOperation({
    operationType: OPERATION_TYPES.EXPORT,
    operator: user,
    targetType,
    afterData: { filters },
    ip
  });
};

const logImport = async (user, targetType, importCount, successCount, failCount, ip) => {
  return logOperation({
    operationType: OPERATION_TYPES.IMPORT,
    operator: user,
    targetType,
    afterData: { importCount, successCount, failCount },
    ip
  });
};

module.exports = {
  logOperation,
  getAuditTrail,
  getChangeDiff,
  compareVersions,
  logLogin,
  logExport,
  logImport,
  OPERATION_TYPES
};
