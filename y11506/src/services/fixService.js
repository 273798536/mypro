const { getDatabase } = require('../db/database');
const { SOURCE_TYPES, RECORD_TYPES } = require('../constants');
const { logRecordUpdate } = require('./historyService');

function markErrorFixed(errorId, operator) {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE validation_errors
    SET is_fixed = 1, fixed_by = ?, fixed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  return stmt.run(operator || process.env.USER || 'system', errorId);
}

function fixCertificateStatus(batchId, operator) {
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];
  
  const certsToFix = db.prepare(`
    SELECT cc.*
    FROM calibration_certificates cc
    WHERE cc.batch_id = ?
      AND cc.is_active = 1
      AND cc.status = 'valid'
      AND cc.expiry_date < ?
  `).all(batchId, today);
  
  let fixedCount = 0;
  
  certsToFix.forEach(cert => {
    const oldData = { ...cert };
    const newData = { status: 'expired', is_active: 0 };
    
    db.prepare(`
      UPDATE calibration_certificates
      SET status = 'expired', is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(cert.id);
    
    logRecordUpdate(RECORD_TYPES.CALIBRATION, cert.id, oldData, newData, operator, batchId);
    
    db.prepare(`
      UPDATE validation_errors
      SET is_fixed = 1, fixed_by = ?, fixed_at = CURRENT_TIMESTAMP
      WHERE batch_id = ?
        AND source_type = 'calibration'
        AND record_id = ?
        AND error_code = 'STATUS_LINKAGE_ISSUE'
    `).run(operator, batchId, cert.id);
    
    fixedCount++;
  });
  
  return fixedCount;
}

function fixDateField(batchId, sourceType, fieldName, oldValue, newValue, operator) {
  const db = getDatabase();
  let tableName, recordType;
  
  switch (sourceType) {
    case SOURCE_TYPES.INSPECTION:
      tableName = 'inspection_records';
      recordType = RECORD_TYPES.INSPECTION;
      break;
    case SOURCE_TYPES.CALIBRATION:
      tableName = 'calibration_certificates';
      recordType = RECORD_TYPES.CALIBRATION;
      break;
    case SOURCE_TYPES.REPAIR:
      tableName = 'repair_quotes';
      recordType = RECORD_TYPES.REPAIR;
      break;
    default:
      throw new Error(`Unknown source type: ${sourceType}`);
  }
  
  const records = db.prepare(`
    SELECT * FROM ${tableName}
    WHERE batch_id = ? AND ${fieldName} = ?
  `).all(batchId, oldValue);
  
  let fixedCount = 0;
  
  records.forEach(record => {
    const oldData = { ...record };
    const newData = { [fieldName]: newValue };
    
    db.prepare(`
      UPDATE ${tableName}
      SET ${fieldName} = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newValue, record.id);
    
    logRecordUpdate(recordType, record.id, oldData, newData, operator, batchId);
    
    db.prepare(`
      UPDATE validation_errors
      SET is_fixed = 1, fixed_by = ?, fixed_at = CURRENT_TIMESTAMP
      WHERE batch_id = ?
        AND source_type = ?
        AND record_id = ?
        AND field_name = ?
    `).run(operator, batchId, sourceType, record.id, fieldName);
    
    fixedCount++;
  });
  
  return fixedCount;
}

function fixInvalidAmount(batchId, operator) {
  const db = getDatabase();
  
  const quotes = db.prepare(`
    SELECT * FROM repair_quotes
    WHERE batch_id = ?
  `).all(batchId);
  
  let fixedCount = 0;
  
  quotes.forEach(quote => {
    const amount = parseFloat(quote.quote_amount);
    if (isNaN(amount) || amount < 0) {
      const oldData = { ...quote };
      const newAmount = 0;
      const newData = { quote_amount: newAmount };
      
      db.prepare(`
        UPDATE repair_quotes
        SET quote_amount = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newAmount, quote.id);
      
      logRecordUpdate(RECORD_TYPES.REPAIR, quote.id, oldData, newData, operator, batchId);
      
      db.prepare(`
        UPDATE validation_errors
        SET is_fixed = 1, fixed_by = ?, fixed_at = CURRENT_TIMESTAMP
        WHERE batch_id = ?
          AND source_type = 'repair'
          AND record_id = ?
          AND error_code = 'INVALID_AMOUNT'
      `).run(operator, batchId, quote.id);
      
      fixedCount++;
    }
  });
  
  return fixedCount;
}

function fixSingleRecord(sourceType, recordId, updates, operator, batchId = null) {
  const db = getDatabase();
  let tableName, recordType;
  
  switch (sourceType) {
    case SOURCE_TYPES.INSPECTION:
      tableName = 'inspection_records';
      recordType = RECORD_TYPES.INSPECTION;
      break;
    case SOURCE_TYPES.CALIBRATION:
      tableName = 'calibration_certificates';
      recordType = RECORD_TYPES.CALIBRATION;
      break;
    case SOURCE_TYPES.REPAIR:
      tableName = 'repair_quotes';
      recordType = RECORD_TYPES.REPAIR;
      break;
    default:
      throw new Error(`Unknown source type: ${sourceType}`);
  }
  
  const oldRecord = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(recordId);
  if (!oldRecord) {
    throw new Error(`Record not found: ${recordId}`);
  }
  
  const setClauses = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = [...Object.values(updates), recordId];
  
  db.prepare(`
    UPDATE ${tableName}
    SET ${setClauses}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(...values);
  
  logRecordUpdate(recordType, recordId, oldRecord, updates, operator, batchId);
  
  return true;
}

function applyFixFromError(errorId, operator) {
  const db = getDatabase();
  const error = db.prepare('SELECT * FROM validation_errors WHERE id = ?').get(errorId);
  
  if (!error) {
    throw new Error(`Error record not found: ${errorId}`);
  }
  
  let fixed = false;
  
  switch (error.error_code) {
    case 'STATUS_LINKAGE_ISSUE':
      if (error.source_type === SOURCE_TYPES.CALIBRATION) {
        fixed = fixSingleRecord(
          SOURCE_TYPES.CALIBRATION,
          error.record_id,
          { status: 'expired', is_active: 0 },
          operator,
          error.batch_id
        );
      }
      break;
      
    case 'INVALID_AMOUNT':
      fixed = fixSingleRecord(
        SOURCE_TYPES.REPAIR,
        error.record_id,
        { quote_amount: 0 },
        operator,
        error.batch_id
      );
      break;
  }
  
  if (fixed) {
    markErrorFixed(errorId, operator);
  }
  
  return fixed;
}

function getFixSuggestions(errorCode) {
  const suggestions = {
    MISSING_REQUIRED: '请补充缺失的必填字段后重新导入',
    INVALID_DATE: '请检查日期格式，建议使用 YYYY-MM-DD 格式',
    INVALID_AMOUNT: '请输入有效的非负数字金额',
    CERTIFICATE_EXPIRED: '建议更新校准证书或标记设备为停用状态',
    CERTIFICATE_EXPIRING_SOON: '建议安排设备校准',
    STATUS_LINKAGE_ISSUE: '可自动修复：将过期证书标记为停用状态',
    INVALID_STATUS: '请选择有效的状态值'
  };
  
  return suggestions[errorCode] || '请检查数据格式和内容';
}

module.exports = {
  markErrorFixed,
  fixCertificateStatus,
  fixDateField,
  fixInvalidAmount,
  fixSingleRecord,
  applyFixFromError,
  getFixSuggestions
};
