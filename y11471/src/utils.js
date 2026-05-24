const { v4: uuidv4 } = require('uuid');
const chalk = require('chalk');
const Table = require('cli-table3');

function generateId() {
  return uuidv4();
}

function generateBatchId(prefix) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${date}-${random}`;
}

function safeParseInt(value, defaultValue = 0) {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN');
}

function formatQty(qty) {
  if (qty === null || qty === undefined) return '-';
  return qty.toLocaleString();
}

function printTable(headers, rows, options = {}) {
  const table = new Table({
    head: headers.map(h => chalk.cyan(h)),
    ...options
  });
  rows.forEach(row => table.push(row));
  console.log(table.toString());
}

function printSuccess(message) {
  console.log(chalk.green(`✓ ${message}`));
}

function printError(message) {
  console.log(chalk.red(`✗ ${message}`));
}

function printWarning(message) {
  console.log(chalk.yellow(`⚠ ${message}`));
}

function printInfo(message) {
  console.log(chalk.blue(`ℹ ${message}`));
}

function printDiff(fieldName, oldValue, newValue) {
  const oldStr = oldValue === null || oldValue === undefined ? '(空)' : String(oldValue);
  const newStr = newValue === null || newValue === undefined ? '(空)' : String(newValue);
  
  if (oldStr === newStr) {
    console.log(`  ${fieldName}: ${chalk.gray(oldStr)}`);
  } else {
    console.log(`  ${fieldName}: ${chalk.red(`-${oldStr}`)} → ${chalk.green(`+${newStr}`)}`);
  }
}

function getStatusColor(status) {
  const colorMap = {
    'pending': chalk.yellow,
    'confirmed': chalk.green,
    'rejected': chalk.red,
    'partial': chalk.blue,
    'reviewing': chalk.magenta,
    'completed': chalk.cyan
  };
  return colorMap[status] || chalk.gray;
}

function getDataQualityLevel(score) {
  if (score >= 90) return { text: '优秀', color: chalk.green };
  if (score >= 70) return { text: '良好', color: chalk.blue };
  if (score >= 50) return { text: '一般', color: chalk.yellow };
  return { text: '较差', color: chalk.red };
}

function validateBatchNo(batchNo) {
  if (!batchNo || typeof batchNo !== 'string') {
    return { valid: false, reason: '批次号不能为空' };
  }
  if (batchNo.trim().length < 3) {
    return { valid: false, reason: '批次号长度不能少于3个字符' };
  }
  return { valid: true };
}

function validateSkuCode(skuCode) {
  if (!skuCode || typeof skuCode !== 'string') {
    return { valid: false, reason: 'SKU编码不能为空' };
  }
  return { valid: true };
}

function validateQty(qty, fieldName = '数量') {
  const parsed = safeParseInt(qty, null);
  if (parsed === null) {
    return { valid: false, reason: `${fieldName}必须是有效数字` };
  }
  if (parsed < 0) {
    return { valid: false, reason: `${fieldName}不能为负数` };
  }
  return { valid: true, value: parsed };
}

function truncateString(str, maxLength = 50) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function calculateDataQuality(record) {
  let score = 0;
  const checks = [];
  
  if (record.apply_qty > 0) { score += 20; } else { checks.push('缺少退供申请数量'); }
  if (record.inspection_qty > 0) { score += 20; } else { checks.push('缺少质检数量'); }
  if (record.shipped_qty > 0) { score += 20; } else { checks.push('缺少发货数量'); }
  if (record.received_qty > 0) { score += 20; } else { checks.push('缺少实收数量'); }
  if (record.sku_name) { score += 10; } else { checks.push('缺少商品名称'); }
  if (record.supplier_name) { score += 10; } else { checks.push('缺少供应商名称'); }
  
  return {
    score,
    checks,
    hasWarning: checks.length > 0,
    warningMessages: checks.join('; ')
  };
}

function calculateSummaryStats(records) {
  const stats = {
    totalRecords: records.length,
    totalApplyQty: 0,
    totalInspectionQty: 0,
    totalShippedQty: 0,
    totalReceivedQty: 0,
    totalExceptionQty: 0,
    totalSmsConfirmedQty: 0,
    totalSupplierAcceptedQty: 0,
    totalSupplierRejectedQty: 0,
    totalSupplierPendingQty: 0,
    byStatus: {},
    byJudgment: {},
    avgDataQuality: 0
  };
  
  let qualitySum = 0;
  
  records.forEach(r => {
    stats.totalApplyQty += r.apply_qty || 0;
    stats.totalInspectionQty += r.inspection_qty || 0;
    stats.totalShippedQty += r.shipped_qty || 0;
    stats.totalReceivedQty += r.received_qty || 0;
    stats.totalExceptionQty += r.exception_qty || 0;
    stats.totalSmsConfirmedQty += r.sms_confirmed_qty || 0;
    stats.totalSupplierAcceptedQty += r.supplier_accepted_qty || 0;
    stats.totalSupplierRejectedQty += r.supplier_rejected_qty || 0;
    stats.totalSupplierPendingQty += r.supplier_pending_qty || 0;
    
    stats.byStatus[r.status] = (stats.byStatus[r.status] || 0) + 1;
    stats.byJudgment[r.judgment || '未判定'] = (stats.byJudgment[r.judgment || '未判定'] || 0) + 1;
    
    qualitySum += r.data_quality_score || 0;
  });
  
  stats.avgDataQuality = records.length > 0 ? Math.round(qualitySum / records.length) : 0;
  
  return stats;
}

module.exports = {
  generateId,
  generateBatchId,
  safeParseInt,
  formatDate,
  formatQty,
  printTable,
  printSuccess,
  printError,
  printWarning,
  printInfo,
  printDiff,
  getStatusColor,
  getDataQualityLevel,
  validateBatchNo,
  validateSkuCode,
  validateQty,
  truncateString,
  deepClone,
  calculateDataQuality,
  calculateSummaryStats
};
