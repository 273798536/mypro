const db = require('../config/database');
const { generateId, getCurrentTimestamp } = require('../utils/common');

class ReturnApplication {
  static create(data) {
    return new Promise((resolve, reject) => {
      const id = generateId();
      const now = getCurrentTimestamp();
      const sql = `INSERT INTO return_applications 
        (id, application_no, supplier_id, supplier_name, total_quantity, total_amount, 
         status, created_by, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
      db.run(sql, [
        id, data.application_no, data.supplier_id, data.supplier_name,
        data.total_quantity || 0, data.total_amount || 0,
        data.status || 'PENDING', data.created_by, now, now
      ], function(err) {
        if (err) reject(err);
        else resolve({ id, ...data, created_at: now, updated_at: now });
      });
    });
  }

  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM return_applications WHERE id = ? AND is_deleted = 0`, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  static findByApplicationNo(applicationNo) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM return_applications WHERE application_no = ? AND is_deleted = 0`, 
        [applicationNo], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  static findAll(options = {}) {
    return new Promise((resolve, reject) => {
      let sql = `SELECT * FROM return_applications WHERE is_deleted = 0`;
      const params = [];
      
      if (options.supplier_id) {
        sql += ` AND supplier_id = ?`;
        params.push(options.supplier_id);
      }
      if (options.status) {
        sql += ` AND status = ?`;
        params.push(options.status);
      }
      if (options.exception_reserved !== undefined) {
        sql += ` AND exception_reserved = ?`;
        params.push(options.exception_reserved ? 1 : 0);
      }
      
      sql += ` ORDER BY created_at DESC`;
      if (options.limit) {
        sql += ` LIMIT ?`;
        params.push(options.limit);
      }
      
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  static update(id, data) {
    return new Promise((resolve, reject) => {
      const now = getCurrentTimestamp();
      const updates = [];
      const params = [];
      
      Object.keys(data).forEach(key => {
        if (key !== 'id' && key !== 'created_at') {
          updates.push(`${key} = ?`);
          params.push(data[key]);
        }
      });
      
      updates.push('updated_at = ?');
      params.push(now);
      params.push(id);
      
      const sql = `UPDATE return_applications SET ${updates.join(', ')} WHERE id = ?`;
      
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  static reserveException(id) {
    return this.update(id, { exception_reserved: 1 });
  }

  static memberCancel(id) {
    return new Promise((resolve, reject) => {
      const now = getCurrentTimestamp();
      db.run(`UPDATE return_applications SET member_canceled_at = ?, exception_reserved = 1, updated_at = ? WHERE id = ?`,
        [now, now, id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  static getSummary(filters = {}) {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT 
          status,
          COUNT(*) as count,
          SUM(total_quantity) as total_quantity,
          SUM(total_amount) as total_amount
        FROM return_applications 
        WHERE is_deleted = 0
      `;
      const params = [];
      
      if (filters.start_date) {
        sql += ` AND created_at >= ?`;
        params.push(filters.start_date);
      }
      if (filters.end_date) {
        sql += ` AND created_at <= ?`;
        params.push(filters.end_date);
      }
      
      sql += ` GROUP BY status`;
      
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = ReturnApplication;
