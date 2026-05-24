const { getDb, runInTransaction } = require('../database');
const { ATTACHMENT_TYPES, ACTIONS, ERROR_TYPES } = require('../database/schema');
const { logAuditTrail } = require('./auditService');
const { recordFailedRecord } = require('./validationService');
const logger = require('../utils/logger');
const crypto = require('crypto');
const fs = require('fs');

function addAttachment({ batchId, attachmentType, fileName, filePath, fileSize, uploadBy, pageCount, pageModified }) {
  return runInTransaction(() => {
    const db = getDb();
    
    const currentVersion = db.prepare(`
      SELECT MAX(version) as max_version FROM attachments 
      WHERE batch_id = ? AND attachment_type = ?
    `).get(batchId, attachmentType);
    
    const version = (currentVersion.max_version || 0) + 1;

    let fileHash = null;
    try {
      const fileBuffer = fs.readFileSync(filePath);
      fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (err) {
      logger.warn(`Could not compute hash for file ${fileName}: ${err.message}`);
    }

    const { isValid, validationError } = validateAttachment(attachmentType, fileName, fileSize);

    const stmt = db.prepare(`
      INSERT INTO attachments 
      (batch_id, attachment_type, file_name, file_path, file_hash, file_size, version, upload_by, page_count, page_modified, is_valid, validation_error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      batchId, attachmentType, fileName, filePath, fileHash, fileSize, 
      version, uploadBy, pageCount, pageModified, isValid ? 1 : 0, validationError
    );
    
    const attachmentId = result.lastInsertRowid;

    logAuditTrail({
      batchId,
      attachmentId,
      action: ACTIONS.UPLOAD_ATTACHMENT,
      fieldName: 'attachment',
      oldValue: null,
      newValue: JSON.stringify({ attachmentType, fileName, version }),
      operator: uploadBy
    });

    if (!isValid) {
      recordFailedRecord({
        batchId,
        recordType: attachmentType,
        recordContent: JSON.stringify({ fileName, fileSize }),
        errorType: ERROR_TYPES.VALIDATION_ERROR,
        errorMessage: validationError,
        errorDetails: JSON.stringify({ fileName, fileSize, attachmentType })
      });
    }

    logger.info(`Attachment added: ${attachmentType} v${version} for batch ${batchId} by ${uploadBy}`);

    return getAttachmentById(attachmentId);
  });
}

function validateAttachment(attachmentType, fileName, fileSize) {
  const validTypes = Object.values(ATTACHMENT_TYPES);
  
  if (!validTypes.includes(attachmentType)) {
    return { isValid: false, validationError: `Invalid attachment type: ${attachmentType}` };
  }
  
  if (!fileName || fileName.length === 0) {
    return { isValid: false, validationError: 'File name cannot be empty' };
  }
  
  if (fileSize <= 0) {
    return { isValid: false, validationError: 'File size must be greater than 0' };
  }
  
  if (fileSize > 10 * 1024 * 1024) {
    return { isValid: false, validationError: 'File size exceeds 10MB limit' };
  }
  
  return { isValid: true, validationError: null };
}

function getAttachmentById(attachmentId) {
  const db = getDb();
  return db.prepare('SELECT * FROM attachments WHERE id = ?').get(attachmentId);
}

function getAttachmentsByBatchId(batchId) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM attachments 
    WHERE batch_id = ? 
    ORDER BY attachment_type, version DESC
  `).all(batchId);
}

function getLatestAttachmentsByBatchId(batchId) {
  const db = getDb();
  return db.prepare(`
    SELECT a.* FROM attachments a
    INNER JOIN (
      SELECT attachment_type, MAX(version) as max_version
      FROM attachments 
      WHERE batch_id = ?
      GROUP BY attachment_type
    ) latest ON a.attachment_type = latest.attachment_type AND a.version = latest.max_version
    WHERE a.batch_id = ?
    ORDER BY a.attachment_type
  `).all(batchId, batchId);
}

function getAttachmentHistory(batchId, attachmentType) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM attachments 
    WHERE batch_id = ? AND attachment_type = ?
    ORDER BY version DESC
  `).all(batchId, attachmentType);
}

function invalidateAttachment(attachmentId, invalidatedBy, reason) {
  return runInTransaction(() => {
    const db = getDb();
    const attachment = getAttachmentById(attachmentId);
    
    if (!attachment) {
      throw new Error(`Attachment not found: ${attachmentId}`);
    }

    db.prepare(`
      UPDATE attachments 
      SET is_valid = 0, validation_error = ?
      WHERE id = ?
    `).run(reason, attachmentId);

    logAuditTrail({
      batchId: attachment.batch_id,
      attachmentId,
      action: 'INVALIDATE',
      fieldName: 'is_valid',
      oldValue: '1',
      newValue: '0',
      operator: invalidatedBy
    });

    recordFailedRecord({
      batchId: attachment.batch_id,
      recordType: attachment.attachment_type,
      recordContent: JSON.stringify({ fileName: attachment.file_name, attachmentId }),
      errorType: ERROR_TYPES.VALIDATION_ERROR,
      errorMessage: reason,
      errorDetails: `Manually invalidated by ${invalidatedBy}`
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
