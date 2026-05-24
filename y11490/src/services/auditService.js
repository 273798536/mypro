const { run, all } = require('../database');

async function logAuditTrail({ batchId, attachmentId, action, fieldName, oldValue, newValue, operator, ipAddress, userAgent }) {
  const sql = `
    INSERT INTO audit_trails 
    (batch_id, attachment_id, action, field_name, old_value, new_value, operator, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  return run(sql, [batchId, attachmentId, action, fieldName, oldValue, newValue, operator, ipAddress, userAgent]);
}

async function getAuditTrailsByBatchId(batchId) {
  const sql = `
    SELECT * FROM audit_trails 
    WHERE batch_id = ? 
    ORDER BY created_at DESC
  `;
  return all(sql, [batchId]);
}

async function getAuditTrailsByAttachmentId(attachmentId) {
  const sql = `
    SELECT * FROM audit_trails 
    WHERE attachment_id = ? 
    ORDER BY created_at DESC
  `;
  return all(sql, [attachmentId]);
}

module.exports = {
  logAuditTrail,
  getAuditTrailsByBatchId,
  getAuditTrailsByAttachmentId
};
