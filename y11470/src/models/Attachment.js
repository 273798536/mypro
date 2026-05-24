const db = require('../config/database');
const { generateId, getCurrentTimestamp } = require('../utils/common');

class Attachment {
  static create(data) {
    return new Promise((resolve, reject) => {
      const id = generateId();
      const now = getCurrentTimestamp();
      const sql = `INSERT INTO attachments 
        (id, batch_id, application_id, type, file_name, file_path, 
         file_size, uploaded_by, uploaded_at, is_exception) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
      db.run(sql, [
        id, data.batch_id || null, data.application_id || null,
        data.type, data.file_name, data.file_path, data.file_size,
        data.uploaded_by, now, data.is_exception || 0
      ], function(err) {
        if (err) reject(err);
        else resolve({ id, ...data, uploaded_at: now });
      });
    });
  }

  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM attachments WHERE id = ?`, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  static findByBatchId(batchId) {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM attachments WHERE batch_id = ? ORDER BY uploaded_at DESC`, 
        [batchId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  static findByApplicationId(applicationId) {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM attachments WHERE application_id = ? ORDER BY uploaded_at DESC`, 
        [applicationId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  static findExceptionAttachments(applicationId = null) {
    return new Promise((resolve, reject) => {
      let sql = `SELECT * FROM attachments WHERE is_exception = 1`;
      const params = [];
      
      if (applicationId) {
        sql += ` AND application_id = ?`;
        params.push(applicationId);
      }
      
      sql += ` ORDER BY uploaded_at DESC`;
      
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  static markAsException(id) {
    return new Promise((resolve, reject) => {
      db.run(`UPDATE attachments SET is_exception = 1 WHERE id = ?`, [id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  static markApplicationAttachmentsAsException(applicationId) {
    return new Promise((resolve, reject) => {
      db.run(`UPDATE attachments SET is_exception = 1 WHERE application_id = ?`, 
        [applicationId], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }
}

module.exports = Attachment;
