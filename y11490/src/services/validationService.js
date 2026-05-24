const { getDb, runInTransaction } = require('../database');
const { ERROR_TYPES } = require('../database/schema');
const logger = require('../utils/logger');

function recordFailedRecord({ batchId, recordType, recordContent, errorType, errorMessage, errorDetails }) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO failed_records 
    (batch_id, record_type, record_content, error_type, error_message, error_details)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(batchId, recordType, recordContent, errorType, errorMessage, errorDetails);
}

function getFailedRecords(batchId, { isResolved, page = 1, pageSize = 50 } = {}) {
  const db = getDb();
  let whereClauses = ['batch_id = ?'];
  let params = [batchId];

  if (isResolved !== undefined) {
    whereClauses.push('is_resolved = ?');
    params.push(isResolved ? 1 : 0);
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM failed_records ${whereSql}`);
  const { total } = countStmt.get(...params);

  const offset = (page - 1) * pageSize;
  const listStmt = db.prepare(`
    SELECT * FROM failed_records ${whereSql}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `);
  const list = listStmt.all(...params, pageSize, offset);

  return {
    list,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}

function resolveFailedRecord(failedRecordId, resolvedBy, resolutionRemark) {
  return runInTransaction(() => {
    const db = getDb();
    const record = db.prepare('SELECT * FROM failed_records WHERE id = ?').get(failedRecordId);
    
    if (!record) {
      throw new Error(`Failed record not found: ${failedRecordId}`);
    }

    db.prepare(`
      UPDATE failed_records 
      SET is_resolved = 1, resolved_by = ?, resolved_at = CURRENT_TIMESTAMP, resolution_remark = ?
      WHERE id = ?
    `).run(resolvedBy, resolutionRemark, failedRecordId);

    logger.info(`Failed record ${failedRecordId} resolved by ${resolvedBy}`);

    return db.prepare('SELECT * FROM failed_records WHERE id = ?').get(failedRecordId);
  });
}

function getValidationSummary(batchId) {
  const db = getDb();
  
  const summary = db.prepare(`
    SELECT 
      COUNT(*) as total_count,
      SUM(CASE WHEN is_resolved = 0 THEN 1 ELSE 0 END) as unhandled_count,
      SUM(CASE WHEN is_resolved = 1 THEN 1 ELSE 0 END) as corrected_count
    FROM failed_records 
    WHERE batch_id = ?
  `).get(batchId);

  const byErrorType = db.prepare(`
    SELECT error_type, COUNT(*) as count, SUM(CASE WHEN is_resolved = 0 THEN 1 ELSE 0 END) as unresolved
    FROM failed_records 
    WHERE batch_id = ?
    GROUP BY error_type
    ORDER BY count DESC
  `).all(batchId);

  return {
    ...summary,
    byErrorType
  };
}

function validateBatchConsistency(batchId) {
  const db = getDb();
  const issues = [];

  const attachments = db.prepare(`
    SELECT attachment_type, COUNT(*) as count, SUM(CASE WHEN is_valid = 1 THEN 1 ELSE 0 END) as valid_count
    FROM attachments 
    WHERE batch_id = ?
    GROUP BY attachment_type
  `).all(batchId);

  const attachmentMap = {};
  attachments.forEach(a => {
    attachmentMap[a.attachment_type] = a;
  });

  const requiredTypes = ['qualification', 'price_version', 'sealed_scan'];
  requiredTypes.forEach(type => {
    if (!attachmentMap[type] || attachmentMap[type].count === 0) {
      issues.push({
        type: ERROR_TYPES.MISSING_ATTACHMENT,
        message: `Missing required attachment: ${type}`,
        severity: 'high'
      });
    } else if (attachmentMap[type].valid_count === 0) {
      issues.push({
        type: ERROR_TYPES.VALIDATION_ERROR,
        message: `No valid attachment for type: ${type}`,
        severity: 'high'
      });
    }
  });

  return {
    isValid: issues.length === 0,
    issues,
    summary: {
      totalAttachments: attachments.reduce((sum, a) => sum + a.count, 0),
      validAttachments: attachments.reduce((sum, a) => sum + a.valid_count, 0),
      attachmentTypes: attachments
    }
  };
}

module.exports = {
  recordFailedRecord,
  getFailedRecords,
  resolveFailedRecord,
  getValidationSummary,
  validateBatchConsistency
};
