const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { Ledger } = require('../models/Ledger');
const { OperationLog } = require('../models/OperationLog');
const { maskSensitiveData } = require('../middleware/auth');
const { logExport } = require('./auditService');
const path = require('path');
const fs = require('fs');

const EXPORT_TYPES = {
  LEDGER: 'ledger',
  REFUND: 'refund',
  INVENTORY: 'inventory',
  AUDIT: 'audit'
};

const EXPORT_ROLES = {
  DATA_ENTRY: ['basic', 'inventory', 'photos'],
  REVIEWER: ['basic', 'inventory', 'photos', 'refund', 'audit'],
  SUPERVISOR: ['*'],
  READ_ONLY: ['basic', 'summary']
};

const ensureExportDir = () => {
  const exportDir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }
  return exportDir;
};

const getRoleBasedFields = (role, exportType) => {
  const allowedSections = EXPORT_ROLES[role] || [];
  if (allowedSections.includes('*')) {
    return getAllFields(exportType);
  }

  const fieldMapping = getFieldMapping(exportType);
  const allowedFields = [];
  
  allowedSections.forEach(section => {
    if (fieldMapping[section]) {
      allowedFields.push(...fieldMapping[section]);
    }
  });

  return allowedFields;
};

const getFieldMapping = (exportType) => {
  const mappings = {
    [EXPORT_TYPES.LEDGER]: {
      basic: ['ledgerNo', 'cabinetId', 'cabinetName', 'city', 'status', 'restockDate', 'createdAt'],
      inventory: ['inventoryBefore', 'inventoryAfter', 'inventoryDiffs', 'totalDiffQuantity'],
      photos: ['photoIds'],
      refund: ['totalRefundAmount', 'totalRefundCount', 'hasDuplicateDeduction'],
      audit: ['createdBy', 'submittedBy', 'reviewedBy', 'secondConfirmedBy', 'finalizedBy'],
      summary: ['ledgerNo', 'cabinetId', 'status', 'totalDiffQuantity', 'totalRefundAmount', 'city']
    }
  };
  return mappings[exportType] || {};
};

const getAllFields = (exportType) => {
  const fieldMapping = getFieldMapping(exportType);
  const allFields = [];
  Object.values(fieldMapping).forEach(fields => allFields.push(...fields));
  return [...new Set(allFields)];
};

const flattenLedgerData = (ledger) => {
  const data = ledger.toObject ? ledger.toObject() : { ...ledger };
  
  if (data.inventoryBefore) {
    data.inventoryBeforeCount = data.inventoryBefore.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }
  if (data.inventoryAfter) {
    data.inventoryAfterCount = data.inventoryAfter.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }
  if (data.inventoryDiffs) {
    data.diffDetails = data.inventoryDiffs.map(d => 
      `${d.productName || d.compartmentId}: ${d.diffQuantity > 0 ? '+' : ''}${d.diffQuantity}`
    ).join('; ');
  }
  if (data.photoIds) {
    data.photoCount = data.photoIds.length;
  }
  if (data.createdBy) {
    data.createdByName = data.createdBy.name;
  }

  return data;
};

const exportLedgersToCSV = async (user, filters = {}, ip) => {
  ensureExportDir();

  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.cabinetId) query.cabinetId = filters.cabinetId;
  if (filters.city) query.city = filters.city;
  if (filters.startDate && filters.endDate) {
    query.restockDate = {
      $gte: new Date(filters.startDate),
      $lte: new Date(filters.endDate)
    };
  }

  const ledgers = await Ledger.find(query)
    .sort({ createdAt: -1 })
    .populate('createdBy', 'name');

  const allowedFields = getRoleBasedFields(user.role, EXPORT_TYPES.LEDGER);
  const flatData = ledgers.map(ledger => flattenLedgerData(ledger));
  const maskedData = maskSensitiveData(flatData);

  const fileName = `ledgers_${user.city}_${Date.now()}.csv`;
  const filePath = path.join(ensureExportDir(), fileName);

  const csvHeaders = allowedFields.map(field => ({
    id: field,
    title: getFieldTitle(field)
  }));

  const csvWriter = createCsvWriter({
    path: filePath,
    header: csvHeaders
  });

  await csvWriter.writeRecords(maskedData);

  await logExport(user, EXPORT_TYPES.LEDGER, filters, ip);

  return {
    filePath,
    fileName,
    recordCount: ledgers.length
  };
};

const getFieldTitle = (field) => {
  const titles = {
    ledgerNo: '台账编号',
    cabinetId: '柜机ID',
    cabinetName: '柜机名称',
    city: '城市',
    status: '状态',
    restockDate: '补货日期',
    createdAt: '创建时间',
    totalDiffQuantity: '差异总数',
    totalRefundAmount: '退款总额',
    totalRefundCount: '退款数量',
    hasDuplicateDeduction: '存在重复扣库',
    hasHotSaleFull: '热销格口满仓',
    inventoryBeforeCount: '补货前库存',
    inventoryAfterCount: '补货后库存',
    diffDetails: '库存差异明细',
    photoCount: '照片数量',
    createdByName: '创建人'
  };
  return titles[field] || field;
};

const exportAuditTrailToCSV = async (user, targetType, targetId, ip) => {
  ensureExportDir();

  const logs = await OperationLog.find({ targetType, targetId })
    .sort({ createdAt: -1 });

  const exportData = logs.map(log => ({
    operationType: getOperationTitle(log.operationType),
    operatorName: log.operatorName,
    operatorRole: getRoleTitle(log.operatorRole),
    changeReason: log.changeReason,
    changes: log.changes?.map(c => `${c.field}: ${c.oldValue} → ${c.newValue}`).join('; '),
    createdAt: log.createdAt,
    success: log.success ? '成功' : '失败'
  }));

  const fileName = `audit_${targetType}_${targetId}_${Date.now()}.csv`;
  const filePath = path.join(ensureExportDir(), fileName);

  const csvWriter = createCsvWriter({
    path: filePath,
    header: [
      { id: 'operationType', title: '操作类型' },
      { id: 'operatorName', title: '操作人' },
      { id: 'operatorRole', title: '角色' },
      { id: 'changeReason', title: '变更原因' },
      { id: 'changes', title: '变更内容' },
      { id: 'createdAt', title: '操作时间' },
      { id: 'success', title: '状态' }
    ]
  });

  await csvWriter.writeRecords(exportData);
  await logExport(user, 'audit', { targetType, targetId }, ip);

  return {
    filePath,
    fileName,
    recordCount: logs.length
  };
};

const getOperationTitle = (type) => {
  const titles = {
    create: '创建',
    update: '更新',
    submit: '提交',
    review: '审核',
    reject: '驳回',
    confirm: '确认',
    second_confirm: '二次确认',
    finalize: '结案',
    export: '导出',
    import: '导入',
    login: '登录'
  };
  return titles[type] || type;
};

const getRoleTitle = (role) => {
  const titles = {
    data_entry: '录入员',
    reviewer: '复核员',
    supervisor: '主管',
    read_only: '只读用户'
  };
  return titles[role] || role;
};

const getRoleViewConfig = (role) => {
  const views = {
    supervisor: {
      tabs: ['all', 'pending', 'reviewing', 'rejected', 'finalized', 'dirty'],
      charts: ['status_distribution', 'city_comparison', 'diff_trend', 'refund_summary'],
      showAdvancedFilters: true,
      showSensitiveData: true
    },
    reviewer: {
      tabs: ['pending', 'reviewing', 'my_reviewed'],
      charts: ['status_distribution', 'my_review_stats'],
      showAdvancedFilters: false,
      showSensitiveData: false
    },
    data_entry: {
      tabs: ['draft', 'my_ledgers', 'rejected'],
      charts: ['my_status_distribution'],
      showAdvancedFilters: false,
      showSensitiveData: false
    },
    read_only: {
      tabs: ['all_view', 'finalized_view'],
      charts: ['summary_view'],
      showAdvancedFilters: false,
      showSensitiveData: false
    }
  };
  return views[role] || views.read_only;
};

const verifyExportConsistency = async (exportType, originalData, exportedData) => {
  if (originalData.length !== exportedData.length) {
    return {
      consistent: false,
      reason: `记录数量不一致: 原始 ${originalData.length}, 导出 ${exportedData.length}`
    };
  }

  const originalIds = new Set(originalData.map(d => d._id?.toString() || d.ledgerNo));
  const exportedIds = new Set(exportedData.map(d => d._id?.toString() || d.ledgerNo));

  const missingIds = [...originalIds].filter(id => !exportedIds.has(id));
  const extraIds = [...exportedIds].filter(id => !originalIds.has(id));

  if (missingIds.length > 0 || extraIds.length > 0) {
    return {
      consistent: false,
      reason: '记录ID不匹配',
      missingIds,
      extraIds
    };
  }

  return { consistent: true };
};

module.exports = {
  EXPORT_TYPES,
  exportLedgersToCSV,
  exportAuditTrailToCSV,
  getRoleViewConfig,
  verifyExportConsistency,
  getRoleBasedFields
};
