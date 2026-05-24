const db = require('../config/database');
const { generateId, getCurrentTimestamp } = require('../utils/common');

class ApprovalEmail {
  static create(data) {
    return new Promise((resolve, reject) => {
      const id = generateId();
      const now = getCurrentTimestamp();
      const sql = `INSERT INTO approval_emails 
        (id, application_id, batch_id, email_subject, email_content, 
         sender, sent_at, is_exception, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
      db.run(sql, [
        id, data.application_id, data.batch_id || null,
        data.email_subject, data.email_content, data.sender,
        data.sent_at || now, data.is_exception || 0, now
      ], function(err) {
        if (err) reject(err);
        else resolve({ id, ...data, created_at: now });
      });
    });
  }

  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM approval_emails WHERE id = ?`, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  static findByApplicationId(applicationId) {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM approval_emails 
              WHERE application_id = ? 
              ORDER BY created_at DESC`, 
        [applicationId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  static findByBatchId(batchId) {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM approval_emails 
              WHERE batch_id = ? 
              ORDER BY created_at DESC`, 
        [batchId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  static findExceptionEmails(applicationId = null) {
    return new Promise((resolve, reject) => {
      let sql = `SELECT * FROM approval_emails WHERE is_exception = 1`;
      const params = [];
      
      if (applicationId) {
        sql += ` AND application_id = ?`;
        params.push(applicationId);
      }
      
      sql += ` ORDER BY created_at DESC`;
      
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  static markAsException(id) {
    return new Promise((resolve, reject) => {
      db.run(`UPDATE approval_emails SET is_exception = 1 WHERE id = ?`, [id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  static markApplicationEmailsAsException(applicationId) {
    return new Promise((resolve, reject) => {
      db.run(`UPDATE approval_emails SET is_exception = 1 WHERE application_id = ?`, 
        [applicationId], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  static findAllByApplicationIdIncludingBatches(applicationId) {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM approval_emails 
              WHERE application_id = ? 
              OR batch_id IN (SELECT id FROM return_batches WHERE application_id = ?)
              ORDER BY created_at DESC`, 
        [applicationId, applicationId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = ApprovalEmail;
