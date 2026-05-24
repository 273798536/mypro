const { getDatabase } = require('../db/database');
const { SOURCE_TYPES } = require('./importService');

function generateBatchReport(batchId) {
  const db = getDatabase();
  
  const batch = db.prepare('SELECT * FROM import_batches WHERE batch_id = ?').get(batchId);
  if (!batch) {
    throw new Error(`Batch not found: ${batchId}`);
  }
  
  const errors = db.prepare(`
    SELECT 
      original_line_no,
      error_code,
      error_message,
      field_name,
      field_value,
      severity,
      is_fixed
    FROM validation_errors
    WHERE batch_id = ?
    ORDER BY severity DESC, original_line_no
  `).all(batchId);
  
  const errorSummary = {};
  errors.forEach(err => {
    const key = err.error_code;
    if (!errorSummary[key]) {
      errorSummary[key] = { count: 0, fixed: 0, message: err.error_message };
    }
    errorSummary[key].count++;
    if (err.is_fixed) errorSummary[key].fixed++;
  });
  
  let records = [];
  let tableName;
  
  switch (batch.source_type) {
    case SOURCE_TYPES.INSPECTION:
      tableName = 'inspection_records';
      records = db.prepare(`
        SELECT id, original_line_no, device_id, device_name, department, inspection_date, inspector, inspection_result, status
        FROM inspection_records
        WHERE batch_id = ?
        ORDER BY original_line_no
      `).all(batchId);
      break;
    case SOURCE_TYPES.CALIBRATION:
      tableName = 'calibration_certificates';
      records = db.prepare(`
        SELECT id, original_line_no, device_id, device_name, certificate_no, calibration_date, expiry_date, status, is_active
        FROM calibration_certificates
        WHERE batch_id = ?
        ORDER BY original_line_no
      `).all(batchId);
      break;
    case SOURCE_TYPES.REPAIR:
      tableName = 'repair_quotes';
      records = db.prepare(`
        SELECT id, original_line_no, device_id, device_name, department, fault_description, quote_amount, quote_date, vendor, status
        FROM repair_quotes
        WHERE batch_id = ?
        ORDER BY original_line_no
      `).all(batchId);
      break;
  }
  
  const errorLineNos = new Set(errors.filter(e => !e.is_fixed).map(e => e.original_line_no));
  const fixedLineNos = new Set(errors.filter(e => e.is_fixed).map(e => e.original_line_no));
  
  const recordsWithErrors = records.map(r => ({
    ...r,
    has_error: errorLineNos.has(r.original_line_no),
    has_fixed_error: fixedLineNos.has(r.original_line_no)
  }));
  
  return {
    batch: {
      id: batch.batch_id,
      sourceType: batch.source_type,
      fileName: batch.file_name,
      importMode: batch.import_mode,
      status: batch.status,
      operator: batch.operator,
      createdAt: batch.created_at,
      totalRows: batch.total_rows,
      successRows: batch.success_rows,
      failedRows: batch.failed_rows
    },
    summary: {
      totalRecords: records.length,
      totalErrors: errors.length,
      unresolvedErrors: errors.filter(e => !e.is_fixed).length,
      fixedErrors: errors.filter(e => e.is_fixed).length,
      errorByType: errorSummary
    },
    failedRows: errors.filter(e => !e.is_fixed).map(e => ({
      lineNo: e.original_line_no,
      errorCode: e.error_code,
      errorMessage: e.error_message,
      field: e.field_name,
      value: e.field_value,
      severity: e.severity
    })),
    correctedRows: recordsWithErrors.filter(r => r.has_fixed_error && !r.has_error),
    records: recordsWithErrors
  };
}

function generateStatusReport() {
  const db = getDatabase();
  
  const inspectionCount = db.prepare('SELECT COUNT(*) as count FROM inspection_records').get().count;
  const calibrationCount = db.prepare('SELECT COUNT(*) as count FROM calibration_certificates').get().count;
  const repairCount = db.prepare('SELECT COUNT(*) as count FROM repair_quotes').get().count;
  
  const today = new Date().toISOString().split('T')[0];
  const expiredCerts = db.prepare(`
    SELECT COUNT(*) as count FROM calibration_certificates
    WHERE is_active = 1 AND expiry_date < ?
  `).get(today).count;
  
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
  const expiringCerts = db.prepare(`
    SELECT COUNT(*) as count FROM calibration_certificates
    WHERE is_active = 1 AND expiry_date >= ? AND expiry_date <= ?
  `).get(today, thirtyDaysLater.toISOString().split('T')[0]).count;
  
  const linkageIssues = db.prepare(`
    SELECT COUNT(*) as count FROM calibration_certificates
    WHERE is_active = 1 AND status = 'valid' AND expiry_date < ?
  `).get(today).count;
  
  const recentBatches = db.prepare(`
    SELECT batch_id, source_type, file_name, status, total_rows, success_rows, failed_rows, created_at
    FROM import_batches
    ORDER BY created_at DESC
    LIMIT 10
  `).all();
  
  const pendingErrors = db.prepare(`
    SELECT COUNT(*) as count FROM validation_errors WHERE is_fixed = 0
  `).get().count;
  
  return {
    overview: {
      totalInspectionRecords: inspectionCount,
      totalCalibrationCertificates: calibrationCount,
      totalRepairQuotes: repairCount
    },
    calibrationStatus: {
      expiredCertificates: expiredCerts,
      expiringCertificates: expiringCerts,
      linkageIssues: linkageIssues
    },
    imports: {
      recentBatches
    },
    issues: {
      pendingValidationErrors: pendingErrors
    },
    generatedAt: new Date().toISOString()
  };
}

function generateDepartmentReport(department) {
  const db = getDatabase();
  
  const inspections = db.prepare(`
    SELECT * FROM inspection_records
    WHERE department = ?
    ORDER BY inspection_date DESC
  `).all(department);
  
  const repairs = db.prepare(`
    SELECT * FROM repair_quotes
    WHERE department = ?
    ORDER BY quote_date DESC
  `).all(department);
  
  const deviceIds = [...new Set([
    ...inspections.map(i => i.device_id),
    ...repairs.map(r => r.device_id)
  ])];
  
  const certsByDevice = {};
  if (deviceIds.length > 0) {
    const placeholders = deviceIds.map(() => '?').join(', ');
    const certs = db.prepare(`
      SELECT * FROM calibration_certificates
      WHERE device_id IN (${placeholders})
      ORDER BY calibration_date DESC
    `).all(...deviceIds);
    
    certs.forEach(c => {
      if (!certsByDevice[c.device_id]) {
        certsByDevice[c.device_id] = [];
      }
      certsByDevice[c.device_id].push(c);
    });
  }
  
  const today = new Date().toISOString().split('T')[0];
  const devicesWithIssues = [];
  
  Object.keys(certsByDevice).forEach(deviceId => {
    const certs = certsByDevice[deviceId];
    const activeCerts = certs.filter(c => c.is_active === 1);
    
    if (activeCerts.length === 0) {
      devicesWithIssues.push({ deviceId, issue: 'no_active_certificate' });
    } else {
      const latestCert = activeCerts[0];
      if (latestCert.expiry_date < today) {
        devicesWithIssues.push({ deviceId, issue: 'certificate_expired', cert: latestCert });
      }
    }
  });
  
  return {
    department,
    summary: {
      inspectionCount: inspections.length,
      repairCount: repairs.length,
      deviceCount: deviceIds.length,
      devicesWithIssues: devicesWithIssues.length
    },
    devicesWithIssues,
    recentInspections: inspections.slice(0, 20),
    recentRepairs: repairs.slice(0, 20),
    generatedAt: new Date().toISOString()
  };
}

function generateFailedImportTemplate(batchId) {
  const db = getDatabase();
  
  const errors = db.prepare(`
    SELECT * FROM validation_errors
    WHERE batch_id = ? AND is_fixed = 0
    ORDER BY original_line_no
  `).all(batchId);
  
  const batch = db.prepare('SELECT * FROM import_batches WHERE batch_id = ?').get(batchId);
  
  let records;
  switch (batch.source_type) {
    case SOURCE_TYPES.INSPECTION:
      records = db.prepare(`
        SELECT * FROM inspection_records WHERE batch_id = ?
      `).all(batchId);
      break;
    case SOURCE_TYPES.CALIBRATION:
      records = db.prepare(`
        SELECT * FROM calibration_certificates WHERE batch_id = ?
      `).all(batchId);
      break;
    case SOURCE_TYPES.REPAIR:
      records = db.prepare(`
        SELECT * FROM repair_quotes WHERE batch_id = ?
      `).all(batchId);
      break;
  }
  
  const failedLineNos = new Set(errors.map(e => e.original_line_no));
  const failedRecords = records.filter(r => failedLineNos.has(r.original_line_no));
  
  return {
    batch,
    failedRecords: failedRecords.map(r => ({
      originalLineNo: r.original_line_no,
      recordData: r,
      errors: errors.filter(e => e.original_line_no === r.original_line_no).map(e => ({
        code: e.error_code,
        message: e.error_message,
        field: e.field_name,
        value: e.field_value
      }))
    }))
  };
}

module.exports = {
  generateBatchReport,
  generateStatusReport,
  generateDepartmentReport,
  generateFailedImportTemplate
};
