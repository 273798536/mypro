const { getDatabase } = require('../db/database');
const { SOURCE_TYPES, ERROR_CODES } = require('../constants');

function logValidationError(db, batchId, sourceType, lineNo, errorCode, errorMessage, fieldName, fieldValue, severityOrRecordId = 'error') {
  let severity = 'error';
  let recordId = null;
  
  if (typeof severityOrRecordId === 'string') {
    severity = severityOrRecordId;
  } else if (typeof severityOrRecordId === 'number') {
    recordId = severityOrRecordId;
  }
  
  const stmt = db.prepare(`
    INSERT INTO validation_errors
    (batch_id, source_type, original_line_no, record_id, error_code, error_message, field_name, field_value, severity)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(batchId, sourceType, lineNo, recordId, errorCode, errorMessage, fieldName, fieldValue, severity);
}

function isValidDate(dateString) {
  if (!dateString) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

function isDateExpired(dateString) {
  if (!dateString) return false;
  const expiryDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return expiryDate < today;
}

function isDateExpiringSoon(dateString, days = 30) {
  if (!dateString) return false;
  const expiryDate = new Date(dateString);
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + days);
  threshold.setHours(0, 0, 0, 0);
  return expiryDate <= threshold && !isDateExpired(dateString);
}

function isValidAmount(amount) {
  if (amount === null || amount === undefined || amount === '') return false;
  const num = parseFloat(amount);
  return !isNaN(num) && num >= 0;
}

function validateInspectionRecord(db, row, lineNo, batchId) {
  const errors = [];
  
  const requiredFields = ['device_id', 'device_name', 'inspection_date', 'inspector'];
  for (const field of requiredFields) {
    if (!row[field]) {
      errors.push({
        code: ERROR_CODES.MISSING_REQUIRED,
        message: `缺少必填字段: ${field}`,
        field,
        value: row[field]
      });
    }
  }
  
  if (row.inspection_date && !isValidDate(row.inspection_date)) {
    errors.push({
      code: ERROR_CODES.INVALID_DATE,
      message: '巡检日期格式无效',
      field: 'inspection_date',
      value: row.inspection_date
    });
  }
  
  if (row.next_inspection_date && !isValidDate(row.next_inspection_date)) {
    errors.push({
      code: ERROR_CODES.INVALID_DATE,
      message: '下次巡检日期格式无效',
      field: 'next_inspection_date',
      value: row.next_inspection_date
    });
  }
  
  const validStatuses = ['active', 'inactive', 'maintenance'];
  if (row.status && !validStatuses.includes(row.status)) {
    errors.push({
      code: ERROR_CODES.INVALID_STATUS,
      message: `状态值无效，有效选项: ${validStatuses.join(', ')}`,
      field: 'status',
      value: row.status
    });
  }
  
  errors.forEach(err => {
    logValidationError(db, batchId, SOURCE_TYPES.INSPECTION, lineNo, err.code, err.message, err.field, err.value);
  });
  
  return errors.length === 0;
}

function validateCalibrationCertificate(db, row, lineNo, batchId) {
  const errors = [];
  const warnings = [];
  
  const requiredFields = ['device_id', 'certificate_no', 'calibration_date', 'expiry_date'];
  for (const field of requiredFields) {
    if (!row[field]) {
      errors.push({
        code: ERROR_CODES.MISSING_REQUIRED,
        message: `缺少必填字段: ${field}`,
        field,
        value: row[field]
      });
    }
  }
  
  if (row.calibration_date && !isValidDate(row.calibration_date)) {
    errors.push({
      code: ERROR_CODES.INVALID_DATE,
      message: '校准日期格式无效',
      field: 'calibration_date',
      value: row.calibration_date
    });
  }
  
  if (row.expiry_date && !isValidDate(row.expiry_date)) {
    errors.push({
      code: ERROR_CODES.INVALID_DATE,
      message: '有效期格式无效',
      field: 'expiry_date',
      value: row.expiry_date
    });
  }
  
  if (row.expiry_date && isDateExpired(row.expiry_date)) {
    warnings.push({
      code: ERROR_CODES.CERTIFICATE_EXPIRED,
      message: '证书已过期',
      field: 'expiry_date',
      value: row.expiry_date,
      severity: 'warning'
    });
  } else if (row.expiry_date && isDateExpiringSoon(row.expiry_date, 30)) {
    warnings.push({
      code: ERROR_CODES.CERTIFICATE_EXPIRING_SOON,
      message: '证书30天内即将过期',
      field: 'expiry_date',
      value: row.expiry_date,
      severity: 'warning'
    });
  }
  
  if (row.is_active === 0 && row.status !== 'expired' && row.expiry_date && isDateExpired(row.expiry_date)) {
    warnings.push({
      code: ERROR_CODES.STATUS_LINKAGE_ISSUE,
      message: '证书已过期但未标记为停用状态',
      field: 'is_active',
      value: row.is_active,
      severity: 'warning'
    });
  }
  
  if (row.is_active === 0 && row.status === 'valid') {
    errors.push({
      code: ERROR_CODES.STATUS_LINKAGE_ISSUE,
      message: '设备已停用但证书状态仍为有效',
      field: 'status',
      value: row.status
    });
  }
  
  [...errors, ...warnings].forEach(err => {
    logValidationError(db, batchId, SOURCE_TYPES.CALIBRATION, lineNo, err.code, err.message, err.field, err.value, err.severity || 'error');
  });
  
  return errors.length === 0;
}

function validateRepairQuote(db, row, lineNo, batchId) {
  const errors = [];
  
  const requiredFields = ['device_id', 'device_name', 'fault_description', 'quote_amount', 'quote_date'];
  for (const field of requiredFields) {
    if (!row[field]) {
      errors.push({
        code: ERROR_CODES.MISSING_REQUIRED,
        message: `缺少必填字段: ${field}`,
        field,
        value: row[field]
      });
    }
  }
  
  if (row.quote_date && !isValidDate(row.quote_date)) {
    errors.push({
      code: ERROR_CODES.INVALID_DATE,
      message: '报价日期格式无效',
      field: 'quote_date',
      value: row.quote_date
    });
  }
  
  if (row.quote_amount !== undefined && !isValidAmount(row.quote_amount)) {
    errors.push({
      code: ERROR_CODES.INVALID_AMOUNT,
      message: '报价金额必须为非负数字',
      field: 'quote_amount',
      value: row.quote_amount
    });
  }
  
  errors.forEach(err => {
    logValidationError(db, batchId, SOURCE_TYPES.REPAIR, lineNo, err.code, err.message, err.field, err.value);
  });
  
  return errors.length === 0;
}

function validateInventoryDiff(db, row, lineNo, batchId) {
  const errors = [];
  const warnings = [];
  
  const requiredFields = ['device_id', 'device_name', 'expected_quantity', 'actual_quantity', 'inventory_date'];
  for (const field of requiredFields) {
    if (row[field] === undefined || row[field] === null || row[field] === '') {
      errors.push({
        code: ERROR_CODES.MISSING_REQUIRED,
        message: `缺少必填字段: ${field}`,
        field,
        value: row[field]
      });
    }
  }
  
  if (row.inventory_date && !isValidDate(row.inventory_date)) {
    errors.push({
      code: ERROR_CODES.INVALID_DATE,
      message: '盘点日期格式无效',
      field: 'inventory_date',
      value: row.inventory_date
    });
  }
  
  const expectedQty = parseInt(row.expected_quantity);
  const actualQty = parseInt(row.actual_quantity);
  
  if (isNaN(expectedQty) || expectedQty < 0) {
    errors.push({
      code: ERROR_CODES.INVALID_AMOUNT,
      message: '账面数量必须为非负整数',
      field: 'expected_quantity',
      value: row.expected_quantity
    });
  }
  
  if (isNaN(actualQty) || actualQty < 0) {
    errors.push({
      code: ERROR_CODES.INVALID_AMOUNT,
      message: '实盘数量必须为非负整数',
      field: 'actual_quantity',
      value: row.actual_quantity
    });
  }
  
  if (!isNaN(expectedQty) && !isNaN(actualQty)) {
    const diff = actualQty - expectedQty;
    if (diff !== 0) {
      warnings.push({
        code: 'DIFF_DETECTED',
        message: diff > 0 ? `盘盈 ${diff} 件` : `盘亏 ${Math.abs(diff)} 件`,
        field: 'difference',
        value: String(diff),
        severity: 'warning'
      });
    }
  }
  
  [...errors, ...warnings].forEach(err => {
    logValidationError(db, batchId, SOURCE_TYPES.INVENTORY, lineNo, err.code, err.message, err.field, err.value, err.severity || 'error');
  });
  
  return errors.length === 0;
}

function validateRefundRecord(db, row, lineNo, batchId) {
  const errors = [];
  
  const requiredFields = ['device_id', 'device_name', 'refund_amount', 'refund_date', 'refund_reason'];
  for (const field of requiredFields) {
    if (!row[field]) {
      errors.push({
        code: ERROR_CODES.MISSING_REQUIRED,
        message: `缺少必填字段: ${field}`,
        field,
        value: row[field]
      });
    }
  }
  
  if (row.refund_date && !isValidDate(row.refund_date)) {
    errors.push({
      code: ERROR_CODES.INVALID_DATE,
      message: '退款日期格式无效',
      field: 'refund_date',
      value: row.refund_date
    });
  }
  
  if (row.refund_amount !== undefined && !isValidAmount(row.refund_amount)) {
    errors.push({
      code: ERROR_CODES.INVALID_AMOUNT,
      message: '退款金额必须为非负数字',
      field: 'refund_amount',
      value: row.refund_amount
    });
  }
  
  errors.forEach(err => {
    logValidationError(db, batchId, SOURCE_TYPES.REFUND, lineNo, err.code, err.message, err.field, err.value, 'error');
  });
  
  return errors.length === 0;
}

function validateBatch(batchId) {
  const db = getDatabase();
  const batch = db.prepare('SELECT * FROM import_batches WHERE batch_id = ?').get(batchId);
  
  if (!batch) {
    throw new Error(`Batch not found: ${batchId}`);
  }
  
  db.prepare('DELETE FROM validation_errors WHERE batch_id = ? AND severity = ? AND error_code != ?').run(batchId, 'warning', 'IMPORT_ERROR');
  
  let records;
  let validateFn;
  
  switch (batch.source_type) {
    case SOURCE_TYPES.INSPECTION:
      records = db.prepare('SELECT * FROM inspection_records WHERE batch_id = ?').all(batchId);
      validateFn = validateInspectionRecord;
      break;
    case SOURCE_TYPES.CALIBRATION:
      records = db.prepare('SELECT * FROM calibration_certificates WHERE batch_id = ?').all(batchId);
      validateFn = validateCalibrationCertificate;
      break;
    case SOURCE_TYPES.REPAIR:
      records = db.prepare('SELECT * FROM repair_quotes WHERE batch_id = ?').all(batchId);
      validateFn = validateRepairQuote;
      break;
    case SOURCE_TYPES.INVENTORY:
      records = db.prepare('SELECT * FROM inventory_diffs WHERE batch_id = ?').all(batchId);
      validateFn = validateInventoryDiff;
      break;
    case SOURCE_TYPES.REFUND:
      records = db.prepare('SELECT * FROM refund_records WHERE batch_id = ?').all(batchId);
      validateFn = validateRefundRecord;
      break;
    default:
      throw new Error(`Unknown source type: ${batch.source_type}`);
  }
  
  let validCount = 0;
  let errorCount = 0;
  
  records.forEach(record => {
    const isValid = validateFn(db, record, record.original_line_no, batchId);
    if (isValid) {
      validCount++;
    } else {
      errorCount++;
    }
  });
  
  return {
    batchId,
    sourceType: batch.source_type,
    totalRecords: records.length,
    validRecords: validCount,
    invalidRecords: errorCount
  };
}

function validateAll() {
  const db = getDatabase();
  
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
  
  const expiredCerts = db.prepare(`
    SELECT * FROM calibration_certificates
    WHERE is_active = 1
      AND expiry_date < ?
  `).all(today);
  
  const expiringCerts = db.prepare(`
    SELECT * FROM calibration_certificates
    WHERE is_active = 1
      AND expiry_date >= ?
      AND expiry_date <= ?
  `).all(today, thirtyDaysLater.toISOString().split('T')[0]);
  
  const linkageIssues = db.prepare(`
    SELECT cc.*
    FROM calibration_certificates cc
    WHERE cc.is_active = 1
      AND cc.status = 'valid'
      AND cc.expiry_date < ?
  `).all(today);
  
  return {
    expiredCertificates: expiredCerts.length,
    expiringCertificates: expiringCerts.length,
    linkageIssues: linkageIssues.length,
    details: {
      expiredCerts,
      expiringCerts,
      linkageIssues
    }
  };
}

function getValidationErrors(batchId, unresolvedOnly = true) {
  const db = getDatabase();
  
  let whereClause = 'batch_id = ?';
  const params = [batchId];
  
  if (unresolvedOnly) {
    whereClause += ' AND is_fixed = 0';
  }
  
  const stmt = db.prepare(`
    SELECT * FROM validation_errors
    WHERE ${whereClause}
    ORDER BY severity DESC, original_line_no
  `);
  
  return stmt.all(...params);
}

module.exports = {
  ERROR_CODES,
  logValidationError,
  validateInspectionRecord,
  validateCalibrationCertificate,
  validateRepairQuote,
  validateInventoryDiff,
  validateRefundRecord,
  validateBatch,
  validateAll,
  getValidationErrors,
  isDateExpired,
  isDateExpiringSoon,
  isValidDate,
  isValidAmount
};
