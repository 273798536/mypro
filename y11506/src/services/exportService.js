const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');
const { getDatabase } = require('../db/database');
const { SOURCE_TYPES } = require('./importService');

function exportToCsv(data, fields, filePath) {
  const parser = new Parser({ fields });
  const csv = parser.parse(data);
  fs.writeFileSync(filePath, csv, 'utf-8');
  return filePath;
}

function exportBatchData(batchId, outputDir) {
  const db = getDatabase();
  const batch = db.prepare('SELECT * FROM import_batches WHERE batch_id = ?').get(batchId);
  
  if (!batch) {
    throw new Error(`Batch not found: ${batchId}`);
  }
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  let records, fields, filename;
  
  switch (batch.source_type) {
    case SOURCE_TYPES.INSPECTION:
      records = db.prepare(`
        SELECT 
          original_line_no,
          device_id,
          device_name,
          department,
          inspection_date,
          inspector,
          inspection_result,
          issues,
          next_inspection_date,
          status
        FROM inspection_records
        WHERE batch_id = ?
        ORDER BY original_line_no
      `).all(batchId);
      
      fields = [
        'original_line_no', 'device_id', 'device_name', 'department',
        'inspection_date', 'inspector', 'inspection_result', 'issues',
        'next_inspection_date', 'status'
      ];
      filename = `inspection_${batchId}.csv`;
      break;
      
    case SOURCE_TYPES.CALIBRATION:
      records = db.prepare(`
        SELECT 
          original_line_no,
          device_id,
          device_name,
          certificate_no,
          calibration_date,
          expiry_date,
          calibration_agency,
          calibration_result,
          status,
          is_active
        FROM calibration_certificates
        WHERE batch_id = ?
        ORDER BY original_line_no
      `).all(batchId);
      
      fields = [
        'original_line_no', 'device_id', 'device_name', 'certificate_no',
        'calibration_date', 'expiry_date', 'calibration_agency',
        'calibration_result', 'status', 'is_active'
      ];
      filename = `calibration_${batchId}.csv`;
      break;
      
    case SOURCE_TYPES.REPAIR:
      records = db.prepare(`
        SELECT 
          original_line_no,
          device_id,
          device_name,
          department,
          fault_description,
          quote_amount,
          quote_date,
          vendor,
          status,
          approval_status
        FROM repair_quotes
        WHERE batch_id = ?
        ORDER BY original_line_no
      `).all(batchId);
      
      fields = [
        'original_line_no', 'device_id', 'device_name', 'department',
        'fault_description', 'quote_amount', 'quote_date', 'vendor',
        'status', 'approval_status'
      ];
      filename = `repair_${batchId}.csv`;
      break;
      
    case SOURCE_TYPES.INVENTORY:
      records = db.prepare(`
        SELECT 
          original_line_no,
          device_id,
          device_name,
          department,
          expected_quantity,
          actual_quantity,
          difference,
          diff_type,
          found_location,
          remarks,
          inventory_date,
          status
        FROM inventory_diffs
        WHERE batch_id = ?
        ORDER BY original_line_no
      `).all(batchId);
      
      fields = [
        'original_line_no', 'device_id', 'device_name', 'department',
        'expected_quantity', 'actual_quantity', 'difference', 'diff_type',
        'found_location', 'remarks', 'inventory_date', 'status'
      ];
      filename = `inventory_${batchId}.csv`;
      break;
      
    case SOURCE_TYPES.REFUND:
      records = db.prepare(`
        SELECT 
          original_line_no,
          device_id,
          device_name,
          department,
          refund_amount,
          refund_date,
          refund_reason,
          vendor,
          status,
          approval_status
        FROM refund_records
        WHERE batch_id = ?
        ORDER BY original_line_no
      `).all(batchId);
      
      fields = [
        'original_line_no', 'device_id', 'device_name', 'department',
        'refund_amount', 'refund_date', 'refund_reason', 'vendor',
        'status', 'approval_status'
      ];
      filename = `refund_${batchId}.csv`;
      break;
      
    default:
      throw new Error(`Unknown source type: ${batch.source_type}`);
  }
  
  const filePath = path.join(outputDir, filename);
  exportToCsv(records, fields, filePath);
  
  return {
    batchId,
    sourceType: batch.source_type,
    exportPath: filePath,
    recordCount: records.length
  };
}

function exportFailedRecords(batchId, outputDir) {
  const db = getDatabase();
  
  const errors = db.prepare(`
    SELECT * FROM validation_errors
    WHERE batch_id = ? AND is_fixed = 0
    ORDER BY original_line_no
  `).all(batchId);
  
  const errorFields = [
    'original_line_no', 'error_code', 'error_message',
    'field_name', 'field_value', 'severity'
  ];
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const errorFilePath = path.join(outputDir, `errors_${batchId}.csv`);
  exportToCsv(errors, errorFields, errorFilePath);
  
  const batch = db.prepare('SELECT * FROM import_batches WHERE batch_id = ?').get(batchId);
  
  if (errors.length > 0) {
    const failedLineNos = [...new Set(errors.map(e => e.original_line_no))];
    
    let records, fields, filename;
    
    switch (batch.source_type) {
      case SOURCE_TYPES.INSPECTION:
        records = db.prepare(`
          SELECT 
            original_line_no,
            device_id,
            device_name,
            department,
            inspection_date,
            inspector,
            inspection_result,
            issues,
            next_inspection_date,
            status
          FROM inspection_records
          WHERE batch_id = ? AND original_line_no IN (${failedLineNos.map(() => '?').join(',')})
          ORDER BY original_line_no
        `).all(batchId, ...failedLineNos);
        
        fields = [
          'original_line_no', 'device_id', 'device_name', 'department',
          'inspection_date', 'inspector', 'inspection_result', 'issues',
          'next_inspection_date', 'status'
        ];
        filename = `failed_inspection_${batchId}.csv`;
        break;
        
      case SOURCE_TYPES.CALIBRATION:
        records = db.prepare(`
          SELECT 
            original_line_no,
            device_id,
            device_name,
            certificate_no,
            calibration_date,
            expiry_date,
            calibration_agency,
            calibration_result,
            status,
            is_active
          FROM calibration_certificates
          WHERE batch_id = ? AND original_line_no IN (${failedLineNos.map(() => '?').join(',')})
          ORDER BY original_line_no
        `).all(batchId, ...failedLineNos);
        
        fields = [
          'original_line_no', 'device_id', 'device_name', 'certificate_no',
          'calibration_date', 'expiry_date', 'calibration_agency',
          'calibration_result', 'status', 'is_active'
        ];
        filename = `failed_calibration_${batchId}.csv`;
        break;
        
      case SOURCE_TYPES.REPAIR:
        records = db.prepare(`
          SELECT 
            original_line_no,
            device_id,
            device_name,
            department,
            fault_description,
            quote_amount,
            quote_date,
            vendor,
            status,
            approval_status
          FROM repair_quotes
          WHERE batch_id = ? AND original_line_no IN (${failedLineNos.map(() => '?').join(',')})
          ORDER BY original_line_no
        `).all(batchId, ...failedLineNos);
        
        fields = [
          'original_line_no', 'device_id', 'device_name', 'department',
          'fault_description', 'quote_amount', 'quote_date', 'vendor',
          'status', 'approval_status'
        ];
        filename = `failed_repair_${batchId}.csv`;
        break;
        
        case SOURCE_TYPES.INVENTORY:
        records = db.prepare(`
          SELECT 
            original_line_no,
            device_id,
            device_name,
            department,
            expected_quantity,
            actual_quantity,
            difference,
            diff_type,
            found_location,
            remarks,
            inventory_date,
            status
          FROM inventory_diffs
          WHERE batch_id = ? AND original_line_no IN (${failedLineNos.map(() => '?').join(',')})
          ORDER BY original_line_no
        `).all(batchId, ...failedLineNos);
        
        fields = [
          'original_line_no', 'device_id', 'device_name', 'department',
          'expected_quantity', 'actual_quantity', 'difference', 'diff_type',
          'found_location', 'remarks', 'inventory_date', 'status'
        ];
        filename = `failed_inventory_${batchId}.csv`;
        break;
        
        case SOURCE_TYPES.REFUND:
        records = db.prepare(`
          SELECT 
            original_line_no,
            device_id,
            device_name,
            department,
            refund_amount,
            refund_date,
            refund_reason,
            vendor,
            status,
            approval_status
          FROM refund_records
          WHERE batch_id = ? AND original_line_no IN (${failedLineNos.map(() => '?').join(',')})
          ORDER BY original_line_no
        `).all(batchId, ...failedLineNos);
        
        fields = [
          'original_line_no', 'device_id', 'device_name', 'department',
          'refund_amount', 'refund_date', 'refund_reason', 'vendor',
          'status', 'approval_status'
        ];
        filename = `failed_refund_${batchId}.csv`;
        break;
    }
    
    const failedFilePath = path.join(outputDir, filename);
    exportToCsv(records, fields, failedFilePath);
    
    return {
      batchId,
      errorFile: errorFilePath,
      failedRecordsFile: failedFilePath,
      errorCount: errors.length,
      failedLineCount: failedLineNos.length
    };
  }
  
  return {
    batchId,
    errorFile: errorFilePath,
    errorCount: errors.length,
    message: 'No failed records found'
  };
}

function exportCalibrationStatus(outputDir, options = {}) {
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];
  
  let whereClause = 'WHERE 1=1';
  const params = [];
  
  if (options.expiredOnly) {
    whereClause += ' AND expiry_date < ?';
    params.push(today);
  } else if (options.expiringSoon) {
    const days = options.days || 30;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    whereClause += ' AND expiry_date >= ? AND expiry_date <= ?';
    params.push(today);
    params.push(futureDate.toISOString().split('T')[0]);
  }
  
  if (options.activeOnly) {
    whereClause += ' AND is_active = 1';
  }
  
  const records = db.prepare(`
    SELECT 
      device_id,
      device_name,
      certificate_no,
      calibration_date,
      expiry_date,
      calibration_agency,
      status,
      is_active,
      CASE 
        WHEN expiry_date < ? THEN 'expired'
        WHEN expiry_date <= date('now', '+30 days') THEN 'expiring_soon'
        ELSE 'valid'
      END as certificate_status
    FROM calibration_certificates
    ${whereClause}
    ORDER BY expiry_date ASC
  `).all(today, ...params);
  
  const fields = [
    'device_id', 'device_name', 'certificate_no', 'certificate_status',
    'calibration_date', 'expiry_date', 'calibration_agency', 'status', 'is_active'
  ];
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const filePath = path.join(outputDir, 'calibration_status.csv');
  exportToCsv(records, fields, filePath);
  
  return {
    exportPath: filePath,
    recordCount: records.length,
    filters: {
      expiredOnly: options.expiredOnly || false,
      expiringSoon: options.expiringSoon || false,
      activeOnly: options.activeOnly || false
    }
  };
}

function exportJson(data, filePath) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  return filePath;
}

function exportReport(report, outputPath) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return exportJson(report, outputPath);
}

module.exports = {
  exportToCsv,
  exportJson,
  exportBatchData,
  exportFailedRecords,
  exportCalibrationStatus,
  exportReport
};
