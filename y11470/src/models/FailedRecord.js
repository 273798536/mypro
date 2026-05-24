const db = require('../config/database');
const { generateId, getCurrentTimestamp } = require('../utils/common');

class FailedRecord {
  static create(data) {
    return new Promise((resolve, reject) => {
      const id = generateId();
      const now = getCurrentTimestamp();
      const sql = `INSERT INTO failed_records 
        (id, record_type, record_data, error_message, failed_at, source, resolved) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`;
      
      db.run(sql, [
        id, data.record_type, 
        typeof data.record_data === 'string' ? data.record_data : JSON.stringify(data.record_data),
        data.error_message, now, data.source, 0
      ], function(err) {
        if (err) reject(err);
        else resolve({ id, ...data, failed_at: now, resolved: 0 });
      });
    });
  }

  static findAll(options = {}) {
    return new Promise((resolve, reject) => {
      let sql = `SELECT * FROM failed_records WHERE 1=1`;
      const params = [];
      
      if (options.resolved !== undefined) {
        sql += ` AND resolved = ?`;
        params.push(options.resolved ? 1 : 0);
      }
      if (options.record_type) {
        sql += ` AND record_type = ?`;
        params.push(options.record_type);
      }
      
      sql += ` ORDER BY failed_at DESC`;
      if (options.limit) {
        sql += ` LIMIT ?`;
        params.push(options.limit);
      }
      
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => ({
          ...row,
          record_data: this._parseRecordData(row.record_data)
        })));
      });
    });
  }

  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM failed_records WHERE id = ?`, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row ? {
          ...row,
          record_data: this._parseRecordData(row.record_data)
        } : null);
      });
    });
  }

  static markResolved(id) {
    return new Promise((resolve, reject) => {
      db.run(`UPDATE failed_records SET resolved = 1 WHERE id = ?`, [id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  static _parseRecordData(data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      return data;
    }
  }
}

module.exports = FailedRecord;
