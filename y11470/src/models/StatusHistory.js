const db = require('../config/database');
const { generateId, getCurrentTimestamp } = require('../utils/common');

class StatusHistory {
  static create(data) {
    return new Promise((resolve, reject) => {
      const id = generateId();
      const now = getCurrentTimestamp();
      const sql = `INSERT INTO status_history 
        (id, batch_id, application_id, from_status, to_status, operation_type, 
         operator, reason, operation_time, is_reentry, reentry_type) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
      db.run(sql, [
        id, data.batch_id, data.application_id, data.from_status, data.to_status,
        data.operation_type, data.operator, data.reason || null, now,
        data.is_reentry || 0, data.reentry_type || null
      ], function(err) {
        if (err) reject(err);
        else resolve({ id, ...data, operation_time: now });
      });
    });
  }

  static findByBatchId(batchId) {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM status_history WHERE batch_id = ? ORDER BY operation_time DESC`, 
        [batchId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  static findByApplicationId(applicationId) {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM status_history WHERE application_id = ? ORDER BY operation_time DESC`, 
        [applicationId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  static findReentryHistory(batchId) {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM status_history WHERE batch_id = ? AND is_reentry = 1 ORDER BY operation_time DESC`, 
        [batchId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  static getFullHistory(batchId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          h.*,
          b.batch_no,
          a.application_no
        FROM status_history h
        LEFT JOIN return_batches b ON h.batch_id = b.id
        LEFT JOIN return_applications a ON h.application_id = a.id
        WHERE h.batch_id = ?
        ORDER BY h.operation_time DESC
      `;
      db.all(sql, [batchId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = StatusHistory;
