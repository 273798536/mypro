const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../db/database');
const { SOURCE_TYPES, IMPORT_MODES, ERROR_CODES } = require('../constants');
const { logRecordCreation, logRecordUpdate, RECORD_TYPES } = require('./historyService');
const { validateInspectionRecord, validateCalibrationCertificate, validateRepairQuote, validateInventoryDiff, validateRefundRecord, logValidationError } = require('./validationService');

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
      
    case SOURCE_TYPES.INVENTORY:
      stmt = db.prepare(`
        SELECT * FROM inventory_diffs
        WHERE device_id = ? AND inventory_date = ?
        LIMIT 1
      `);
      return stmt.get(data.device_id || '', data.inventory_date || '');
      
    case SOURCE_TYPES.REFUND:
      stmt = db.prepare(`
        SELECT * FROM refund_records
        WHERE device_id = ? AND refund_date = ? AND vendor = ?
        LIMIT 1
      `);
      return stmt.get(data.device_id || '', data.refund_date || '', data.vendor || '');
      
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
      
    case SOURCE_TYPES.INVENTORY:
      const expectedQty = parseInt(data.expected_quantity) || 0;
      const actualQty = parseInt(data.actual_quantity) || 0;
      const diff = actualQty - expectedQty;
      let diffType = data.diff_type;
      if (!diffType) {
        diffType = diff > 0 ? 'surplus' : diff < 0 ? 'shortage' : 'matched';
      }
      stmt = db.prepare(`
        INSERT INTO inventory_diffs
        (batch_id, original_line_no, device_id, device_name, department,
         expected_quantity, actual_quantity, difference, diff_type,
         found_location, remarks, inventory_date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const invResult = stmt.run(
        batchId, lineNo,
        data.device_id, data.device_name, data.department,
        expectedQty, actualQty, diff, diffType,
        data.found_location, data.remarks, data.inventory_date,
        data.status || 'pending'
      );
      recordId = invResult.lastInsertRowid;
      const invData = { ...data, expected_quantity: expectedQty, actual_quantity: actualQty, difference: diff, diff_type: diffType };
      logRecordCreation(RECORD_TYPES.INVENTORY, recordId, invData, null, batchId);
      break;
      
    case SOURCE_TYPES.REFUND:
      stmt = db.prepare(`
        INSERT INTO refund_records
        (batch_id, original_line_no, device_id, device_name, department,
         refund_amount, refund_date, refund_reason, vendor, status, approval_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const refundResult = stmt.run(
        batchId, lineNo,
        data.device_id, data.device_name, data.department,
        data.refund_amount, data.refund_date, data.refund_reason,
        data.vendor, data.status || 'pending', data.approval_status
      );
      recordId = refundResult.lastInsertRowid;
      logRecordCreation(RECORD_TYPES.REFUND, recordId, data, null, batchId);
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
      
    case SOURCE_TYPES.INVENTORY:
      const expectedQty = parseInt(data.expected_quantity) || existing.expected_quantity || 0;
      const actualQty = parseInt(data.actual_quantity) || existing.actual_quantity || 0;
      const diff = actualQty - expectedQty;
      let diffType = data.diff_type;
      if (!diffType) {
        diffType = diff > 0 ? 'surplus' : diff < 0 ? 'shortage' : 'matched';
      }
      stmt = db.prepare(`
        UPDATE inventory_diffs
        SET batch_id = ?, original_line_no = ?, device_name = ?, department = ?,
            expected_quantity = ?, actual_quantity = ?, difference = ?, diff_type = ?,
            found_location = ?, remarks = ?, inventory_date = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(
        batchId, lineNo,
        data.device_name || existing.device_name,
        data.department || existing.department,
        expectedQty, actualQty, diff, diffType,
        data.found_location || existing.found_location,
        data.remarks || existing.remarks,
        data.inventory_date || existing.inventory_date,
        data.status || existing.status,
        existing.id
      );
      const invData = { ...existing, ...data, expected_quantity: expectedQty, actual_quantity: actualQty, difference: diff, diff_type: diffType };
      logRecordUpdate(RECORD_TYPES.INVENTORY, existing.id, existing, invData, null, batchId);
      break;
      
    case SOURCE_TYPES.REFUND:
      stmt = db.prepare(`
        UPDATE refund_records
        SET batch_id = ?, original_line_no = ?, device_name = ?, department = ?,
            refund_amount = ?, refund_date = ?, refund_reason = ?, vendor = ?,
            status = ?, approval_status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(
        batchId, lineNo,
        data.device_name || existing.device_name,
        data.department || existing.department,
        data.refund_amount || existing.refund_amount,
        data.refund_date || existing.refund_date,
        data.refund_reason || existing.refund_reason,
        data.vendor || existing.vendor,
        data.status || existing.status,
        data.approval_status || existing.approval_status,
        existing.id
      );
      logRecordUpdate(RECORD_TYPES.REFUND, existing.id, existing, data, null, batchId);
      break;
  }
  
  return existing.id;
}

function getValidateFunction(sourceType) {
  switch (sourceType) {
    case SOURCE_TYPES.INSPECTION:
      return validateInspectionRecord;
    case SOURCE_TYPES.CALIBRATION:
      return validateCalibrationCertificate;
    case SOURCE_TYPES.REPAIR:
      return validateRepairQuote;
    case SOURCE_TYPES.INVENTORY:
      return validateInventoryDiff;
    case SOURCE_TYPES.REFUND:
      return validateRefundRecord;
    default:
      return null;
  }
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
  const validateFn = validate ? getValidateFunction(sourceType) : null;
  
  const importedRecordIds = [];
  
  try {
    const rows = await parseCsvFile(filePath);
    let successCount = 0;
    let importErrorCount = 0;
    let validationErrorCount = 0;
    let skippedCount = 0;
    
    for (let i = 0; i < rows.length; i++) {
      const lineNo = i + 2;
      const row = rows[i];
      
      const processRow = db.transaction(() => {
        try {
          const existing = findExistingRecord(db, sourceType, row);
          let recordId = null;
          let action = null;
          
          if (existing) {
            if (mode === IMPORT_MODES.IGNORE) {
              return { skipped: true, recordId: existing.id };
            } else if (mode === IMPORT_MODES.OVERWRITE) {
              recordId = updateRecord(db, sourceType, existing, row, batchId, lineNo);
              action = 'overwritten';
            } else {
              recordId = insertRecord(db, sourceType, row, batchId, lineNo);
              action = 'appended';
            }
          } else {
            recordId = insertRecord(db, sourceType, row, batchId, lineNo);
            action = 'inserted';
          }
          
          return { success: true, recordId, action };
        } catch (error) {
          logValidationError(
            db, batchId, sourceType, lineNo,
            'IMPORT_ERROR', error.message,
            null, JSON.stringify(row).substring(0, 500), null
          );
          return { error: true, errorMessage: error.message };
        }
      });
      
      const result = processRow();
      
      if (result.skipped) {
        skippedCount++;
      } else if (result.error) {
        importErrorCount++;
      } else {
        successCount++;
        importedRecordIds.push({ recordId: result.recordId, lineNo, row });
      }
      
      if ((i + 1) % 100 === 0) {
        updateBatchStats(batchId, i + 1, successCount, importErrorCount);
      }
    }
    
    if (validate && validateFn) {
      db.prepare('DELETE FROM validation_errors WHERE batch_id = ? AND error_code != ?')
        .run(batchId, 'IMPORT_ERROR');
      
      for (const item of importedRecordIds) {
        const isValid = validateFn(db, item.row, item.lineNo, batchId);
        
        if (!isValid) {
          validationErrorCount++;
          db.prepare(`
            UPDATE validation_errors
            SET record_id = ?
            WHERE batch_id = ? AND original_line_no = ? AND record_id IS NULL
          `).run(item.recordId, batchId, item.lineNo);
        }
      }
      
      const errorCount = db.prepare(
        'SELECT COUNT(DISTINCT original_line_no) as count FROM validation_errors WHERE batch_id = ? AND severity = ?'
      ).get(batchId, 'error').count;
      
      if (errorCount > 0 && validationErrorCount === 0) {
        validationErrorCount = errorCount;
      }
    }
    
    const totalFailed = importErrorCount + validationErrorCount;
    updateBatchStats(batchId, rows.length, successCount, totalFailed);
    
    let finalStatus;
    if (importErrorCount > 0 && validationErrorCount === 0) {
      finalStatus = 'import_failed';
    } else if (validationErrorCount > 0) {
      finalStatus = 'validation_failed';
    } else if (importErrorCount === 0 && validationErrorCount === 0) {
      finalStatus = 'completed';
    } else {
      finalStatus = 'completed_with_errors';
    }
    
    completeBatch(batchId, finalStatus);
    
    return {
      batchId,
      totalRows: rows.length,
      successRows: successCount,
      skippedRows: skippedCount,
      importFailedRows: importErrorCount,
      validationFailedRows: validationErrorCount,
      failedRows: totalFailed,
      mode,
      status: finalStatus
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
  parseCsvFile,
  getValidateFunction
};
