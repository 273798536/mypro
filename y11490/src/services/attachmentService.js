const { get, run, all, runInTransaction } = require('../database');
const { ATTACHMENT_TYPES, ACTIONS, ERROR_TYPES } = require('../database/schema');
const { logAuditTrail } = require('./auditService');
const { recordFailedRecord, SOURCE_TYPES } = require('./validationService');
const logger = require('../utils/logger');
const crypto = require('crypto');
const fs = require('fs');

async function addAttachment({ batchId, attachmentType, fileName, filePath, fileSize, uploadBy, pageCount, pageModified }) {
  return runInTransaction(async () => {
    const currentVersion = await get(`
      SELECT MAX(version) as max_version FROM attachments 
      WHERE batch_id = ? AND attachment_type = ?
    `, [batchId, attachmentType]);
    
    const version = (currentVersion.max_version || 0) + 1;

    let fileHash = null;
    try {
      const fileBuffer = fs.readFileSync(filePath);
      fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (err) {
      logger.warn(`Could not compute hash for file ${fileName}: ${err.message}`);
    }

    const { isValid, validationError } = validateAttachment(attachmentType, fileName, fileSize);

    const stmt = await run(`
      INSERT INTO attachments 
      (batch_id, attachment_type, file_name, file_path, file_hash, file_size, version, upload_by, page_count, page_modified, is_valid, validation_error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      batchId, attachmentType, fileName, filePath, fileHash, fileSize, 
      version, uploadBy, pageCount, pageModified, isValid ? 1 : 0, validationError
    ]);
    
    const attachmentId = stmt.lastID;

    await logAuditTrail({
      batchId,
      attachmentId,
      action: ACTIONS.UPLOAD_ATTACHMENT,
      fieldName: 'attachment',
      oldValue: null,
      newValue: JSON.stringify({ attachmentType, fileName, version, pageModified }),
      operator: uploadBy
    });

    if (!isValid) {
      await recordFailedRecord({
        batchId,
        recordType: attachmentType,
        recordContent: JSON.stringify({ fileName, fileSize, attachmentId, version }),
        errorType: ERROR_TYPES.VALIDATION_ERROR,
        errorMessage: validationError,
        errorDetails: JSON.stringify({ fileName, fileSize, attachmentType, version }),
        sourceType: SOURCE_TYPES.ATTACHMENT_UPLOAD,
        sourceReference: `attachment:${attachmentId}`
      });
    }

    logger.info(`Attachment added: ${attachmentType} v${version} for batch ${batchId} by ${uploadBy}`);

    return getAttachmentById(attachmentId);
  });
}

function validateAttachment(attachmentType, fileName, fileSize) {
  const validTypes = Object.values(ATTACHMENT_TYPES);
  
  if (!validTypes.includes(attachmentType)) {
    return { isValid: false, validationError: `无效的附件类型: ${attachmentType}` };
  }
  
  if (!fileName || fileName.length === 0) {
    return { isValid: false, validationError: '文件名不能为空' };
  }
  
  if (fileSize <= 0) {
    return { isValid: false, validationError: '文件大小必须大于0' };
  }
  
  if (fileSize > 10 * 1024 * 1024) {
    return { isValid: false, validationError: '文件大小超过10MB限制' };
  }
  
  return { isValid: true, validationError: null };
}

async function getAttachmentById(attachmentId) {
  return get('SELECT * FROM attachments WHERE id = ?', [attachmentId]);
}

async function getAttachmentsByBatchId(batchId) {
  return all(`
    SELECT * FROM attachments 
    WHERE batch_id = ? 
    ORDER BY attachment_type, version DESC
  `, [batchId]);
}

async function getLatestAttachmentsByBatchId(batchId) {
  const attachments = await all(`
    SELECT attachment_type, MAX(version) as max_version
    FROM attachments 
    WHERE batch_id = ?
    GROUP BY attachment_type
  `, [batchId]);

  const results = [];
  for (const att of attachments) {
    const latest = await get(`
      SELECT * FROM attachments 
      WHERE batch_id = ? AND attachment_type = ? AND version = ?
    `, [batchId, att.attachment_type, att.max_version]);
    if (latest) {
      results.push(latest);
    }
  }
  return results.sort((a, b) => a.attachment_type.localeCompare(b.attachment_type));
}

async function getAttachmentHistory(batchId, attachmentType) {
  return all(`
    SELECT * FROM attachments 
    WHERE batch_id = ? AND attachment_type = ?
    ORDER BY version DESC
  `, [batchId, attachmentType]);
}

async function invalidateAttachment(attachmentId, invalidatedBy, reason) {
  return runInTransaction(async () => {
    const attachment = await getAttachmentById(attachmentId);
    
    if (!attachment) {
      throw new Error(`Attachment not found: ${attachmentId}`);
    }

    await run(`
      UPDATE attachments 
      SET is_valid = 0, validation_error = ?
      WHERE id = ?
    `, [reason, attachmentId]);

    await logAuditTrail({
      batchId: attachment.batch_id,
      attachmentId,
      action: 'INVALIDATE',
      fieldName: 'is_valid',
      oldValue: '1',
      newValue: '0',
      operator: invalidatedBy
    });

    await recordFailedRecord({
      batchId: attachment.batch_id,
      recordType: attachment.attachment_type,
      recordContent: JSON.stringify({ fileName: attachment.file_name, attachmentId, version: attachment.version }),
      errorType: ERROR_TYPES.VALIDATION_ERROR,
      errorMessage: reason,
      errorDetails: `由 ${invalidatedBy} 手动标记无效`,
      sourceType: SOURCE_TYPES.MANUAL_INVALIDATION,
      sourceReference: `attachment:${attachmentId}`
    });

    logger.info(`Attachment ${attachmentId} invalidated by ${invalidatedBy}: ${reason}`);

    return getAttachmentById(attachmentId);
  });
}

module.exports = {
  addAttachment,
  getAttachmentById,
  getAttachmentsByBatchId,
  getLatestAttachmentsByBatchId,
  getAttachmentHistory,
  invalidateAttachment
};
