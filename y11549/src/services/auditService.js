const db = require('../config/database');

const logAction = (recordType, recordId, action, options = {}) => {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO audit_logs (
        record_type, record_id, action, field_name, old_value, new_value,
        change_reason, operator, operator_role, old_workflow_state, new_workflow_state
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [
      recordType,
      recordId,
      action,
      options.fieldName || null,
      options.oldValue || null,
      options.newValue || null,
      options.changeReason || null,
      options.operator || 'system',
      options.operatorRole || null,
      options.oldWorkflowState || null,
      options.newWorkflowState || null
    ], function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID });
    });
  });
};

const getAuditTrail = (recordType, recordId) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT * FROM audit_logs
      WHERE record_type = ? AND record_id = ?
      ORDER BY created_at DESC, id DESC
    `;
    db.all(sql, [recordType, recordId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

module.exports = {
  logAction,
  getAuditTrail
};
