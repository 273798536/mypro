const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

class FailedRecord {
  static async create(data) {
    const id = uuidv4();
    const now = moment().toISOString();
    
    await db.run(`
      INSERT INTO failed_records (
        id, record_type, record_data, error_message, error_code,
        failed_at, retry_count, resolved
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 0)
    `,
      id,
      data.record_type,
      data.record_data,
      data.error_message,
      data.error_code || null,
      now
    );
    
    return this.findById(id);
  }

  static async findById(id) {
    const record = await db.get('SELECT * FROM failed_records WHERE id = ?', id);
    if (record) {
      record.record_data = JSON.parse(record.record_data);
    }
    return record;
  }

  static async findAll(options = {}) {
    let sql = 'SELECT * FROM failed_records WHERE 1=1';
    const params = [];
    
    if (options.record_type) {
      sql += ' AND record_type = ?';
      params.push(options.record_type);
    }
    
    if (options.resolved !== undefined) {
      sql += ' AND resolved = ?';
      params.push(options.resolved ? 1 : 0);
    }
    
    sql += ' ORDER BY failed_at DESC';
    
    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }
    
    const records = await db.all(sql, ...params);
    return records.map(r => ({
      ...r,
      record_data: JSON.parse(r.record_data)
    }));
  }

  static async markResolved(id, resolvedBy) {
    const now = moment().toISOString();
    await db.run(`
      UPDATE failed_records 
      SET resolved = 1, resolved_at = ?, resolved_by = ?
      WHERE id = ?
    `, now, resolvedBy, id);
    
    return this.findById(id);
  }

  static async incrementRetry(id) {
    const now = moment().toISOString();
    await db.run(`
      UPDATE failed_records 
      SET retry_count = retry_count + 1, last_retry_at = ?
      WHERE id = ?
    `, now, id);
    
    return this.findById(id);
  }

  static async getStats() {
    const result = await db.all(`
      SELECT 
        record_type,
        COUNT(*) as total,
        SUM(CASE WHEN resolved = 0 THEN 1 ELSE 0 END) as unresolved,
        SUM(CASE WHEN resolved = 1 THEN 1 ELSE 0 END) as resolved
      FROM failed_records
      GROUP BY record_type
    `);
    
    return result;
  }
}

module.exports = FailedRecord;
