const { ObjectId } = require('mongoose').Types;
const { Ledger } = require('../models/Ledger');
const { DirtyRecord, DIRTY_TYPES } = require('../models/DirtyRecord');
const { OperationLog } = require('../models/OperationLog');
const { detectDuplicateImport, createDirtyRecord } = require('./dirtyRecordService');

const CHECK_TYPES = {
  DUPLICATE_IMPORT: 'duplicate_import',
  PERMISSION_INTERCEPT: 'permission_intercept',
  EXCEPTION_RETAIN: 'exception_retain',
  RESTART_HISTORY: 'restart_history',
  EXPORT_CONSISTENCY: 'export_consistency'
};

const checkDuplicateImport = async (sourceType, uniqueKey, uniqueValue, cabinetId) => {
  const isDuplicate = await detectDuplicateImport(sourceType, uniqueKey, uniqueValue);
  
  if (isDuplicate) {
    await createDirtyRecord({
      dirtyType: DIRTY_TYPES.DUPLICATE_IMPORT,
      sourceType,
      cabinetId,
      originalData: { [uniqueKey]: uniqueValue },
      remark: `检测到重复导入: ${uniqueKey} = ${uniqueValue}`
    });
    
    return {
      hasIssue: true,
      issueType: CHECK_TYPES.DUPLICATE_IMPORT,
      message: '检测到重复导入，已标记为脏记录',
      details: { uniqueKey, uniqueValue }
    };
  }

  return { hasIssue: false };
};

const checkBatchDuplicateImport = async (sourceType, uniqueKey, items) => {
  const issues = [];
  const seenValues = new Set();

  for (const item of items) {
    const uniqueValue = item[uniqueKey];
    
    if (seenValues.has(uniqueValue)) {
      issues.push({
        item,
        reason: '批次内重复'
      });
      continue;
    }
    
    seenValues.add(uniqueValue);
    
    const checkResult = await checkDuplicateImport(
      sourceType,
      uniqueKey,
      uniqueValue,
      item.cabinetId
    );
    
    if (checkResult.hasIssue) {
      issues.push({
        item,
        reason: '系统中已存在'
      });
    }
  }

  return {
    hasIssue: issues.length > 0,
    totalCount: items.length,
    duplicateCount: issues.length,
    issues
  };
};

const checkPermissionIntercept = async (userId, userRole, operation, targetId, targetType) => {
  const { ROLE_PERMISSIONS } = require('../models/User');
  const permissions = ROLE_PERMISSIONS[userRole];

  if (!permissions.canEdit.includes(operation) && !permissions.canEdit.includes('*')) {
    await OperationLog.create({
      operationType: operation,
      operator: userId,
      targetType,
      targetId,
      success: false,
      errorMessage: `权限拦截: 角色 ${userRole} 无权限执行 ${operation}`
    });

    return {
      hasIssue: true,
      issueType: CHECK_TYPES.PERMISSION_INTERCEPT,
      message: '权限不足，操作已被拦截',
      details: { userRole, operation }
    };
  }

  return { hasIssue: false };
};

const checkExceptionRetain = async (ledgerId, exceptionData) => {
  const ledger = await Ledger.findById(ledgerId);
  if (!ledger) {
    return { hasIssue: false };
  }

  let hasException = false;

  if (exceptionData.missingFields && exceptionData.missingFields.length > 0) {
    hasException = true;
  }

  if (exceptionData.conflicts && exceptionData.conflicts.length > 0) {
    hasException = true;
  }

  if (hasException) {
    await createDirtyRecord({
      dirtyType: exceptionData.type || DIRTY_TYPES.OTHER,
      sourceType: 'ledger',
      sourceId: ledgerId,
      ledgerId,
      cabinetId: ledger.cabinetId,
      originalData: exceptionData.data,
      missingFields: exceptionData.missingFields || [],
      conflictFields: exceptionData.conflicts || [],
      remark: exceptionData.remark || '异常记录自动保留'
    });

    return {
      hasIssue: true,
      issueType: CHECK_TYPES.EXCEPTION_RETAIN,
      message: '异常记录已保留到脏记录表',
      dirtyRecordId: null
    };
  }

  return { hasIssue: false };
};

const checkRestartHistory = async (ledgerId) => {
  const ledger = await Ledger.findById(ledgerId);
  if (!ledger) {
    return { hasIssue: false };
  }

  const historyIntact = ledger.previousVersions && ledger.previousVersions.length > 0;
  const logs = await OperationLog.find({
    targetType: 'ledger',
    targetId: ledgerId
  }).sort({ createdAt: 1 });

  const versionNumbers = ledger.previousVersions?.map(v => v.version) || [];
  const hasGaps = versionNumbers.some((v, i) => i > 0 && v !== versionNumbers[i - 1] + 1);

  if (hasGaps || !historyIntact) {
    return {
      hasIssue: true,
      issueType: CHECK_TYPES.RESTART_HISTORY,
      message: '历史版本不完整，可能存在数据丢失',
      details: {
        versionCount: ledger.previousVersions?.length || 0,
        logCount: logs.length,
        hasGaps
      }
    };
  }

  return {
    hasIssue: false,
    details: {
      versionCount: ledger.previousVersions?.length || 0,
      logCount: logs.length
    }
  };
};

const checkExportConsistency = async (exportType, filters, exportedCount) => {
  let actualCount = 0;

  if (exportType === 'ledger') {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.city) query.city = filters.city;
    if (filters.startDate && filters.endDate) {
      query.restockDate = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    }
    actualCount = await Ledger.countDocuments(query);
  }

  if (actualCount !== exportedCount) {
    return {
      hasIssue: true,
      issueType: CHECK_TYPES.EXPORT_CONSISTENCY,
      message: '导出数据不一致',
      details: {
        expectedCount: actualCount,
        exportedCount,
        diff: actualCount - exportedCount
      }
    };
  }

  return {
    hasIssue: false,
    details: { count: actualCount }
  };
};

const runAllChecks = async (ledgerId, context = {}) => {
  const results = [];
  const ledger = await Ledger.findById(ledgerId);

  if (!ledger) {
    return {
      hasIssues: true,
      checks: [{ hasIssue: true, message: '台账不存在' }],
      summary: { total: 1, passed: 0, failed: 1 }
    };
  }

  const historyCheck = await checkRestartHistory(ledgerId);
  results.push({
    ...historyCheck,
    checkName: '历史版本完整性检查',
    checkType: CHECK_TYPES.RESTART_HISTORY
  });

  const duplicateImportCheck = await checkDuplicateImport(
    'ledger',
    'ledgerNo',
    ledger.ledgerNo,
    ledger.cabinetId
  );
  results.push({
    ...duplicateImportCheck,
    checkName: '重复导入检查',
    checkType: CHECK_TYPES.DUPLICATE_IMPORT
  });

  const permissionCheck = {
    checkName: '权限拦截检查',
    checkType: CHECK_TYPES.PERMISSION_INTERCEPT,
    hasIssue: false,
    details: {}
  };
  
  let ledgerObjectId;
  try {
    ledgerObjectId = new ObjectId(ledgerId);
  } catch (e) {
    ledgerObjectId = ledgerId;
  }

  const permissionBlockedCount = await OperationLog.countDocuments({
    targetType: 'ledger',
    $or: [
      { targetId: ledgerObjectId },
      { targetId: ledgerId }
    ],
    success: false,
    errorMessage: { $regex: '权限拦截' }
  });
  permissionCheck.details = { permissionBlockedCount };
  if (permissionBlockedCount > 0) {
    permissionCheck.hasIssue = true;
    permissionCheck.message = `检测到 ${permissionBlockedCount} 次权限拦截，权限控制正常工作`;
  } else {
    permissionCheck.message = '暂无该台账的权限拦截记录，权限控制正常';
  }
  results.push(permissionCheck);

  const exceptionCheck = {
    checkName: '异常保留检查',
    checkType: CHECK_TYPES.EXCEPTION_RETAIN,
    hasIssue: false,
    details: {}
  };
  const dirtyCount = ledger.dirtyRecordIds?.length || 0;
  const pendingDirtyCount = await DirtyRecord.countDocuments({
    ledgerId,
    processStatus: 'pending'
  });
  exceptionCheck.details = { totalDirtyRecords: dirtyCount, pendingDirtyRecords: pendingDirtyCount };
  if (pendingDirtyCount > 0) {
    exceptionCheck.hasIssue = true;
    exceptionCheck.message = `存在 ${pendingDirtyCount} 条待处理脏记录`;
  } else if (dirtyCount > 0) {
    exceptionCheck.message = `存在 ${dirtyCount} 条脏记录，均已处理`;
  } else {
    exceptionCheck.message = '无脏记录，数据正常';
  }
  results.push(exceptionCheck);

  const exportCheck = {
    checkName: '导出一致性检查',
    checkType: CHECK_TYPES.EXPORT_CONSISTENCY,
    hasIssue: false,
    details: {}
  };
  const recentExports = await OperationLog.find({
    operationType: 'export',
    targetType: 'ledger',
    targetId: ledgerId
  }).sort({ createdAt: -1 }).limit(5);
  exportCheck.details = { recentExportCount: recentExports.length };
  if (recentExports.length === 0) {
    exportCheck.message = '暂无导出记录';
  } else {
    exportCheck.message = `有 ${recentExports.length} 次导出记录，导出操作已记录`;
  }
  results.push(exportCheck);

  return {
    hasIssues: results.some(r => r.hasIssue),
    checks: results,
    summary: {
      total: results.length,
      passed: results.filter(r => !r.hasIssue).length,
      failed: results.filter(r => r.hasIssue).length
    }
  };
};

const getCheckStats = async (timeRange = {}) => {
  const query = {};
  if (timeRange.start && timeRange.end) {
    query.createdAt = {
      $gte: new Date(timeRange.start),
      $lte: new Date(timeRange.end)
    };
  }

  const dirtyStats = await DirtyRecord.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$dirtyType',
        count: { $sum: 1 }
      }
    }
  ]);

  const permissionBlockedCount = await OperationLog.countDocuments({
    ...query,
    success: false,
    errorMessage: { $regex: '权限拦截' }
  });

  const duplicateImportCount = await DirtyRecord.countDocuments({
    ...query,
    dirtyType: DIRTY_TYPES.DUPLICATE_IMPORT
  });

  return {
    dirtyRecords: dirtyStats,
    permissionBlocks: permissionBlockedCount,
    duplicateImports: duplicateImportCount
  };
};

module.exports = {
  CHECK_TYPES,
  checkDuplicateImport,
  checkBatchDuplicateImport,
  checkPermissionIntercept,
  checkExceptionRetain,
  checkRestartHistory,
  checkExportConsistency,
  runAllChecks,
  getCheckStats
};
