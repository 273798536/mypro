const { getDatabase } = require('../db/database');
const { SOURCE_TYPES, logValidationError } = require('./importService');

const ERROR_CODES = {
  MISSING_REQUIRED: 'MISSING_REQUIRED',
  INVALID_DATE: 'INVALID_DATE',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  CERTIFICATE_EXPIRED: 'CERTIFICATE_EXPIRED',
  CERTIFICATE_EXPIRING_SOON: 'CERTIFICATE_EXPIRING_SOON',
  DEVICE_NOT_FOUND: 'DEVICE_NOT_FOUND',
  INVALID_STATUS: 'INVALID_STATUS',
  DUPLICATE_RECORD: 'DUPLICATE_RECORD',
  STATUS_LINKAGE_ISSUE: 'STATUS_LINKAGE_ISSUE'
};

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
    const stmt = db.prepare(`
      INSERT INTO validation_errors
      (batch_id, source_type, original_line_no, error_code, error_message, field_name, field_value, severity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(batchId, SOURCE_TYPES.CALIBRATION, lineNo, err.code, err.message, err.field, err.value, err.severity || 'error');
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

function validateBatch(batchId) {
  const db = getDatabase();
  const batch = db.prepare('SELECT * FROM import_batches WHERE batch_id = ?').get(batchId);
  
  if (!batch) {
    throw new Error(`Batch not found: ${batchId}`);
  }
  
  db.prepare('DELETE FROM validation_errors WHERE batch_id = ?').run(batchId);
  
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
  validateInspectionRecord,
  validateCalibrationCertificate,
  validateRepairQuote,
  validateBatch,
  validateAll,
  getValidationErrors,
  isDateExpired,
  isDateExpiringSoon,
  isValidDate,
  isValidAmount
};
