const db = require('../config/database');
const { generateId, getCurrentTimestamp, RETURN_STATUSES } = require('../utils/common');

class ReturnBatch {
  static create(data) {
    return new Promise((resolve, reject) => {
      const id = generateId();
      const now = getCurrentTimestamp();
      const sql = `INSERT INTO return_batches 
        (id, application_id, batch_no, product_code, product_name, quantity, 
         unit_price, amount, status, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
      const amount = data.quantity * data.unit_price;
      
      db.run(sql, [
        id, data.application_id, data.batch_no, data.product_code,
        data.product_name, data.quantity, data.unit_price, amount,
        RETURN_STATUSES.CREATED, now, now
      ], function(err) {
        if (err) reject(err);
        else resolve({ id, ...data, amount, status: RETURN_STATUSES.CREATED, created_at: now, updated_at: now });
      });
    });
  }

  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM return_batches WHERE id = ?`, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  static findByBatchNo(batchNo) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM return_batches WHERE batch_no = ?`, [batchNo], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  static findByApplicationId(applicationId) {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM return_batches WHERE application_id = ? ORDER BY created_at DESC`, 
        [applicationId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  static findAll(options = {}) {
    return new Promise((resolve, reject) => {
      let sql = `SELECT * FROM return_batches WHERE 1=1`;
      const params = [];
      
      if (options.application_id) {
        sql += ` AND application_id = ?`;
        params.push(options.application_id);
      }
      if (options.status) {
        sql += ` AND status = ?`;
        params.push(options.status);
      }
      if (options.product_code) {
        sql += ` AND product_code = ?`;
        params.push(options.product_code);
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
      
      const sql = `UPDATE return_batches SET ${updates.join(', ')} WHERE id = ?`;
      
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  static updateStatus(id, newStatus, operator, reason = null) {
    return new Promise(async (resolve, reject) => {
      try {
        const batch = await this.findById(id);
        if (!batch) {
          return reject(new Error('批次不存在'));
        }
        
        const now = getCurrentTimestamp();
        db.run(`UPDATE return_batches SET status = ?, previous_status = ?, updated_at = ? WHERE id = ?`,
          [newStatus, batch.status, now, id], function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes, previous_status: batch.status, new_status: newStatus });
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  static freeze(id, freezeReason, operator) {
    return this.updateStatus(id, RETURN_STATUSES.FROZEN, operator, freezeReason)
      .then(result => {
        if (result.changes > 0) {
          return this.update(id, { freeze_reason: freezeReason })
            .then(() => result);
        }
        return result;
      });
  }

  static unfreeze(id, operator) {
    return this.updateStatus(id, RETURN_STATUSES.REVIEWED, operator);
  }

  static getDetailed(id) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          b.*,
          a.application_no,
          a.supplier_id,
          a.supplier_name,
          a.exception_reserved,
          a.member_canceled_at
        FROM return_batches b
        LEFT JOIN return_applications a ON b.application_id = a.id
        WHERE b.id = ?
      `;
      db.get(sql, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  static getSummary(filters = {}) {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT 
          status,
          COUNT(*) as count,
          SUM(quantity) as total_quantity,
          SUM(amount) as total_amount
        FROM return_batches 
        WHERE 1=1
      `;
      const params = [];
      
      if (filters.application_id) {
        sql += ` AND application_id = ?`;
        params.push(filters.application_id);
      }
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

  static getInternalView(filters = {}) {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT 
          b.id,
          b.batch_no,
          b.product_code,
          b.product_name,
          b.quantity,
          b.amount,
          b.status,
          b.previous_status,
          b.freeze_reason,
          b.manual_reason,
          b.created_at,
          b.updated_at,
          a.application_no,
          a.supplier_name,
          a.exception_reserved
        FROM return_batches b
        LEFT JOIN return_applications a ON b.application_id = a.id
        WHERE 1=1
      `;
      const params = [];
      
      if (filters.status) {
        sql += ` AND b.status = ?`;
        params.push(filters.status);
      }
      if (filters.exception_reserved === 1) {
        sql += ` AND a.exception_reserved = 1`;
      }
      
      sql += ` ORDER BY b.updated_at DESC`;
      
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = ReturnBatch;
