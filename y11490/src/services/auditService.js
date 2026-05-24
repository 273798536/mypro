const { getDb } = require('../database');

function logAuditTrail({ batchId, attachmentId, action, fieldName, oldValue, newValue, operator, ipAddress, userAgent }) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO audit_trails 
    (batch_id, attachment_id, action, field_name, old_value, new_value, operator, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(batchId, attachmentId, action, fieldName, oldValue, newValue, operator, ipAddress, userAgent);
}

function getAuditTrailsByBatchId(batchId) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM audit_trails 
    WHERE batch_id = ? 
    ORDER BY created_at DESC
  `);
  return stmt.all(batchId);
}

function getAuditTrailsByAttachmentId(attachmentId) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM audit_trails 
    WHERE attachment_id = ? 
    ORDER BY created_at DESC
  `);
  return stmt.all(attachmentId);
}

module.exports = {
  logAuditTrail,
  getAuditTrailsByBatchId,
  getAuditTrailsByAttachmentId
};
