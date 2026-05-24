const { get, run, all, runInTransaction } = require('../database');
const { ERROR_TYPES } = require('../database/schema');
const logger = require('../utils/logger');

const SOURCE_TYPES = {
  CONSISTENCY_CHECK: 'consistency_check',
  ATTACHMENT_UPLOAD: 'attachment_upload',
  MANUAL_INVALIDATION: 'manual_invalidation'
};

function recordFailedRecord({ batchId, recordType, recordContent, errorType, errorMessage, errorDetails, sourceType, sourceReference }) {
  const sql = `
    INSERT INTO failed_records 
    (batch_id, record_type, record_content, error_type, error_message, error_details, source_type, source_reference)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  return run(sql, [batchId, recordType, recordContent, errorType, errorMessage, errorDetails, sourceType, sourceReference]);
}

async function getFailedRecords(batchId, { isResolved, errorType, page = 1, pageSize = 50 } = {}) {
  let whereClauses = ['batch_id = ?'];
  let params = [batchId];

  if (isResolved !== undefined) {
    whereClauses.push('is_resolved = ?');
    params.push(isResolved ? 1 : 0);
  }
  
  if (errorType) {
    whereClauses.push('error_type = ?');
    params.push(errorType);
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

  const countResult = await get(`SELECT COUNT(*) as total FROM failed_records ${whereSql}`, params);
  const total = countResult.total;

  const offset = (page - 1) * pageSize;
  const list = await all(`
    SELECT id, batch_id, record_type, record_content, error_type, error_message, 
           error_details, source_type, source_reference, is_resolved, 
           resolved_by, resolved_at, resolution_remark, created_at
    FROM failed_records ${whereSql}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, pageSize, offset]);

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

async function getAllFailedRecords(batchId, { isResolved } = {}) {
  let whereClauses = ['batch_id = ?'];
  let params = [batchId];

  if (isResolved !== undefined) {
    whereClauses.push('is_resolved = ?');
    params.push(isResolved ? 1 : 0);
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

  return all(`
    SELECT id, batch_id, record_type, record_content, error_type, error_message, 
           error_details, source_type, source_reference, is_resolved, 
           resolved_by, resolved_at, resolution_remark, created_at
    FROM failed_records ${whereSql}
    ORDER BY created_at DESC
  `, params);
}

async function resolveFailedRecord(failedRecordId, resolvedBy, resolutionRemark) {
  return runInTransaction(async () => {
    const record = await get('SELECT * FROM failed_records WHERE id = ?', [failedRecordId]);
    
    if (!record) {
      throw new Error(`Failed record not found: ${failedRecordId}`);
    }

    await run(`
      UPDATE failed_records 
      SET is_resolved = 1, resolved_by = ?, resolved_at = CURRENT_TIMESTAMP, resolution_remark = ?
      WHERE id = ?
    `, [resolvedBy, resolutionRemark, failedRecordId]);

    logger.info(`Failed record ${failedRecordId} resolved by ${resolvedBy}`);

    return get('SELECT * FROM failed_records WHERE id = ?', [failedRecordId]);
  });
}

async function getValidationSummary(batchId) {
  const summary = await get(`
    SELECT 
      COUNT(*) as total_count,
      SUM(CASE WHEN is_resolved = 0 THEN 1 ELSE 0 END) as unhandled_count,
      SUM(CASE WHEN is_resolved = 1 THEN 1 ELSE 0 END) as corrected_count
    FROM failed_records 
    WHERE batch_id = ?
  `, [batchId]);

  const byErrorType = await all(`
    SELECT error_type, COUNT(*) as count, SUM(CASE WHEN is_resolved = 0 THEN 1 ELSE 0 END) as unresolved
    FROM failed_records 
    WHERE batch_id = ?
    GROUP BY error_type
    ORDER BY count DESC
  `, [batchId]);

  const needManualConfirm = await get(`
    SELECT COUNT(*) as count 
    FROM failed_records 
    WHERE batch_id = ? 
      AND is_resolved = 0
      AND error_type IN ('DATA_INCONSISTENCY', 'DUPLICATE_RECORD')
  `, [batchId]);

  return {
    totalCount: summary.total_count || 0,
    unhandledCount: summary.unhandled_count || 0,
    correctedCount: summary.corrected_count || 0,
    needManualConfirmCount: needManualConfirm.count || 0,
    byErrorType
  };
}

async function checkExistingIssue(batchId, errorType, errorMessage) {
  const existing = await get(`
    SELECT id FROM failed_records 
    WHERE batch_id = ? 
      AND error_type = ? 
      AND error_message = ? 
      AND is_resolved = 0
    LIMIT 1
  `, [batchId, errorType, errorMessage]);
  
  return existing !== undefined;
}

async function validateBatchConsistency(batchId, { autoPersist = true } = {}) {
  const attachments = await all(`
    SELECT attachment_type, COUNT(*) as count, SUM(CASE WHEN is_valid = 1 THEN 1 ELSE 0 END) as valid_count
    FROM attachments 
    WHERE batch_id = ?
    GROUP BY attachment_type
  `, [batchId]);

  const attachmentMap = {};
  attachments.forEach(a => {
    attachmentMap[a.attachment_type] = a;
  });

  const issues = [];
  const requiredTypes = ['qualification', 'price_version', 'sealed_scan'];

  for (const type of requiredTypes) {
    if (!attachmentMap[type] || attachmentMap[type].count === 0) {
      issues.push({
        type: ERROR_TYPES.MISSING_ATTACHMENT,
        message: `缺少必需的附件类型: ${type}`,
        severity: 'high',
        recordType: type,
        recordContent: JSON.stringify({ attachmentType: type, required: true }),
        errorDetails: `该批次缺少 ${type} 类型的附件，这是投标资料的必需文件`
      });
    } else if (attachmentMap[type].valid_count === 0) {
      issues.push({
        type: ERROR_TYPES.VALIDATION_ERROR,
        message: `附件类型 ${type} 没有有效的版本`,
        severity: 'high',
        recordType: type,
        recordContent: JSON.stringify({ attachmentType: type, count: attachmentMap[type].count, validCount: 0 }),
        errorDetails: `该批次有 ${attachmentMap[type].count} 个 ${type} 附件，但全部无效`
      });
    }
  }

  const attachmentList = await all(`
    SELECT id, attachment_type, file_name, version, is_valid, validation_error, upload_by, created_at
    FROM attachments 
    WHERE batch_id = ?
    ORDER BY attachment_type, version DESC
  `, [batchId]);

  for (const att of attachmentList) {
    if (!att.is_valid && att.validation_error) {
      issues.push({
        type: ERROR_TYPES.VALIDATION_ERROR,
        message: `附件 ${att.file_name} (v${att.version}) 验证失败`,
        severity: 'medium',
        recordType: att.attachment_type,
        recordContent: JSON.stringify({ 
          attachmentId: att.id, 
          fileName: att.file_name, 
          version: att.version,
          uploadBy: att.upload_by
        }),
        errorDetails: att.validation_error,
        sourceReference: `attachment:${att.id}`
      });
    }
  }

  if (autoPersist && issues.length > 0) {
    await runInTransaction(async () => {
      for (const issue of issues) {
        const exists = await checkExistingIssue(batchId, issue.type, issue.message);
        if (!exists) {
          await recordFailedRecord({
            batchId,
            recordType: issue.recordType,
            recordContent: issue.recordContent,
            errorType: issue.type,
            errorMessage: issue.message,
            errorDetails: issue.errorDetails,
            sourceType: SOURCE_TYPES.CONSISTENCY_CHECK,
            sourceReference: issue.sourceReference || null
          });
        }
      }
    });
    logger.info(`Consistency check for batch ${batchId}: ${issues.length} issues persisted`);
  }

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
  getAllFailedRecords,
  resolveFailedRecord,
  getValidationSummary,
  validateBatchConsistency,
  SOURCE_TYPES
};
