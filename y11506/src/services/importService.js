const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../db/database');
const { logRecordCreation, logRecordUpdate, RECORD_TYPES } = require('./historyService');

const IMPORT_MODES = {
  APPEND: 'append',
  OVERWRITE: 'overwrite',
  IGNORE: 'ignore'
};

const SOURCE_TYPES = {
  INSPECTION: 'inspection',
  CALIBRATION: 'calibration',
  REPAIR: 'repair',
  REFUND: 'refund'
};

function createBatch(sourceType, fileName, importMode, operator) {
  const db = getDatabase();
  const batchId = uuidv4();
  
  const stmt = db.prepare(`
    INSERT INTO import_batches 
    (batch_id, source_type, file_name, import_mode, status, operator)
    VALUES (?, ?, ?, ?, 'processing', ?)
  `);
  
  stmt.run(batchId, sourceType, fileName, importMode, operator || process.env.USER || 'system');
  return batchId;
}

function updateBatchStats(batchId, totalRows, successRows, failedRows) {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE import_batches
    SET total_rows = ?, success_rows = ?, failed_rows = ?, updated_at = CURRENT_TIMESTAMP
    WHERE batch_id = ?
  `);
  return stmt.run(totalRows, successRows, failedRows, batchId);
}

function completeBatch(batchId, status = 'completed') {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE import_batches
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE batch_id = ?
  `);
  return stmt.run(status, batchId);
}

function parseCsvFile(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

function findExistingRecord(db, sourceType, data) {
  let stmt;
  
  switch (sourceType) {
    case SOURCE_TYPES.INSPECTION:
      stmt = db.prepare(`
        SELECT * FROM inspection_records
        WHERE device_id = ? AND inspection_date = ?
        LIMIT 1
      `);
      return stmt.get(data.device_id, data.inspection_date);
      
    case SOURCE_TYPES.CALIBRATION:
      stmt = db.prepare(`
        SELECT * FROM calibration_certificates
        WHERE certificate_no = ? OR (device_id = ? AND calibration_date = ?)
        LIMIT 1
      `);
      return stmt.get(data.certificate_no || '', data.device_id || '', data.calibration_date || '');
      
    case SOURCE_TYPES.REPAIR:
      stmt = db.prepare(`
        SELECT * FROM repair_quotes
        WHERE device_id = ? AND quote_date = ? AND vendor = ?
        LIMIT 1
      `);
      return stmt.get(data.device_id || '', data.quote_date || '', data.vendor || '');
      
    default:
      return null;
  }
}

function insertRecord(db, sourceType, data, batchId, lineNo) {
  let stmt, recordId;
  
  switch (sourceType) {
    case SOURCE_TYPES.INSPECTION:
      stmt = db.prepare(`
        INSERT INTO inspection_records
        (batch_id, original_line_no, device_id, device_name, department,
         inspection_date, inspector, inspection_result, issues, next_inspection_date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        batchId, lineNo,
        data.device_id, data.device_name, data.department,
        data.inspection_date, data.inspector, data.inspection_result,
        data.issues, data.next_inspection_date, data.status || 'active'
      );
      recordId = result.lastInsertRowid;
      logRecordCreation(RECORD_TYPES.INSPECTION, recordId, data, null, batchId);
      break;
      
    case SOURCE_TYPES.CALIBRATION:
      stmt = db.prepare(`
        INSERT INTO calibration_certificates
        (batch_id, original_line_no, device_id, device_name, certificate_no,
         calibration_date, expiry_date, calibration_agency, calibration_result, status, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const calResult = stmt.run(
        batchId, lineNo,
        data.device_id, data.device_name, data.certificate_no,
        data.calibration_date, data.expiry_date, data.calibration_agency,
        data.calibration_result, data.status || 'valid', data.is_active !== undefined ? data.is_active : 1
      );
      recordId = calResult.lastInsertRowid;
      logRecordCreation(RECORD_TYPES.CALIBRATION, recordId, data, null, batchId);
      break;
      
    case SOURCE_TYPES.REPAIR:
      stmt = db.prepare(`
        INSERT INTO repair_quotes
        (batch_id, original_line_no, device_id, device_name, department,
         fault_description, quote_amount, quote_date, vendor, status, approval_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const repairResult = stmt.run(
        batchId, lineNo,
        data.device_id, data.device_name, data.department,
        data.fault_description, data.quote_amount, data.quote_date,
        data.vendor, data.status || 'pending', data.approval_status
      );
      recordId = repairResult.lastInsertRowid;
      logRecordCreation(RECORD_TYPES.REPAIR, recordId, data, null, batchId);
      break;
  }
  
  return recordId;
}

function updateRecord(db, sourceType, existing, data, batchId, lineNo) {
  let stmt;
  
  switch (sourceType) {
    case SOURCE_TYPES.INSPECTION:
      stmt = db.prepare(`
        UPDATE inspection_records
        SET batch_id = ?, original_line_no = ?, device_name = ?, department = ?,
            inspector = ?, inspection_result = ?, issues = ?, next_inspection_date = ?,
            status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(
        batchId, lineNo,
        data.device_name || existing.device_name,
        data.department || existing.department,
        data.inspector || existing.inspector,
        data.inspection_result || existing.inspection_result,
        data.issues || existing.issues,
        data.next_inspection_date || existing.next_inspection_date,
        data.status || existing.status,
        existing.id
      );
      logRecordUpdate(RECORD_TYPES.INSPECTION, existing.id, existing, data, null, batchId);
      break;
      
    case SOURCE_TYPES.CALIBRATION:
      stmt = db.prepare(`
        UPDATE calibration_certificates
        SET batch_id = ?, original_line_no = ?, device_name = ?, calibration_date = ?,
            expiry_date = ?, calibration_agency = ?, calibration_result = ?,
            status = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(
        batchId, lineNo,
        data.device_name || existing.device_name,
        data.calibration_date || existing.calibration_date,
        data.expiry_date || existing.expiry_date,
        data.calibration_agency || existing.calibration_agency,
        data.calibration_result || existing.calibration_result,
        data.status || existing.status,
        data.is_active !== undefined ? data.is_active : existing.is_active,
        existing.id
      );
      logRecordUpdate(RECORD_TYPES.CALIBRATION, existing.id, existing, data, null, batchId);
      break;
      
    case SOURCE_TYPES.REPAIR:
      stmt = db.prepare(`
        UPDATE repair_quotes
        SET batch_id = ?, original_line_no = ?, device_name = ?, department = ?,
            fault_description = ?, quote_amount = ?, vendor = ?,
            status = ?, approval_status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(
        batchId, lineNo,
        data.device_name || existing.device_name,
        data.department || existing.department,
        data.fault_description || existing.fault_description,
        data.quote_amount || existing.quote_amount,
        data.vendor || existing.vendor,
        data.status || existing.status,
        data.approval_status || existing.approval_status,
        existing.id
      );
      logRecordUpdate(RECORD_TYPES.REPAIR, existing.id, existing, data, null, batchId);
      break;
  }
  
  return existing.id;
}

function logValidationError(db, batchId, sourceType, lineNo, errorCode, errorMessage, fieldName, fieldValue) {
  const stmt = db.prepare(`
    INSERT INTO validation_errors
    (batch_id, source_type, original_line_no, error_code, error_message, field_name, field_value, severity)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'error')
  `);
  stmt.run(batchId, sourceType, lineNo, errorCode, errorMessage, fieldName, fieldValue);
}

async function importData(sourceType, filePath, options = {}) {
  const db = getDatabase();
  const {
    mode = IMPORT_MODES.APPEND,
    operator = process.env.USER || 'system',
    validate = true
  } = options;
  
  if (!Object.values(SOURCE_TYPES).includes(sourceType)) {
    throw new Error(`Invalid source type: ${sourceType}`);
  }
  
  if (!Object.values(IMPORT_MODES).includes(mode)) {
    throw new Error(`Invalid import mode: ${mode}`);
  }
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  const fileName = path.basename(filePath);
  const batchId = createBatch(sourceType, fileName, mode, operator);
  
  try {
    const rows = await parseCsvFile(filePath);
    let successCount = 0;
    let errorCount = 0;
    
    const importTransaction = db.transaction((row, lineNo) => {
      try {
        const existing = findExistingRecord(db, sourceType, row);
        
        if (existing) {
          if (mode === IMPORT_MODES.IGNORE) {
            return { skipped: true };
          } else if (mode === IMPORT_MODES.OVERWRITE) {
            updateRecord(db, sourceType, existing, row, batchId, lineNo);
          } else {
            insertRecord(db, sourceType, row, batchId, lineNo);
          }
        } else {
          insertRecord(db, sourceType, row, batchId, lineNo);
        }
        
        return { success: true };
      } catch (error) {
        logValidationError(
          db, batchId, sourceType, lineNo,
          'IMPORT_ERROR', error.message,
          null, JSON.stringify(row).substring(0, 500)
        );
        return { error: true };
      }
    });
    
    for (let i = 0; i < rows.length; i++) {
      const lineNo = i + 2;
      const result = importTransaction(rows[i], lineNo);
      
      if (result.error) {
        errorCount++;
      } else {
        successCount++;
      }
      
      if ((i + 1) % 100 === 0) {
        updateBatchStats(batchId, i + 1, successCount, errorCount);
      }
    }
    
    updateBatchStats(batchId, rows.length, successCount, errorCount);
    completeBatch(batchId, errorCount > 0 ? 'completed_with_errors' : 'completed');
    
    return {
      batchId,
      totalRows: rows.length,
      successRows: successCount,
      failedRows: errorCount,
      mode
    };
    
  } catch (error) {
    completeBatch(batchId, 'failed');
    throw error;
  }
}

function getBatchInfo(batchId) {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM import_batches WHERE batch_id = ?');
  return stmt.get(batchId);
}

function listBatches(limit = 50) {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM import_batches
    ORDER BY created_at DESC
    LIMIT ?
  `);
  return stmt.all(limit);
}

function getBatchErrors(batchId) {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM validation_errors
    WHERE batch_id = ?
    ORDER BY original_line_no
  `);
  return stmt.all(batchId);
}

module.exports = {
  IMPORT_MODES,
  SOURCE_TYPES,
  importData,
  createBatch,
  updateBatchStats,
  completeBatch,
  getBatchInfo,
  listBatches,
  getBatchErrors,
  findExistingRecord,
  insertRecord,
  updateRecord,
  logValidationError
};
