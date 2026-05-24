const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

class AuditLog {
  static async create(data) {
    const id = uuidv4();
    const now = moment().toISOString();
    
    await db.run(`
      INSERT INTO audit_logs (
        id, ledger_id, action, old_value, new_value,
        changed_fields, operator_id, operator_name, operator_role,
        operation_time, ip_address, user_agent, remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      id,
      data.ledger_id || null,
      data.action,
      data.old_value ? JSON.stringify(data.old_value) : null,
      data.new_value ? JSON.stringify(data.new_value) : null,
      data.changed_fields ? JSON.stringify(data.changed_fields) : null,
      data.operator_id,
      data.operator_name,
      data.operator_role,
      now,
      data.ip_address || null,
      data.user_agent || null,
      data.remark || null
    );
    
    return id;
  }

  static async findByLedgerId(ledgerId) {
    const logs = await db.all(`
      SELECT * FROM audit_logs 
      WHERE ledger_id = ? 
      ORDER BY operation_time DESC
    `, ledgerId);
    
    return logs.map(log => ({
      ...log,
      old_value: log.old_value ? JSON.parse(log.old_value) : null,
      new_value: log.new_value ? JSON.parse(log.new_value) : null,
      changed_fields: log.changed_fields ? JSON.parse(log.changed_fields) : null
    }));
  }

  static async findAll(options = {}) {
    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];
    
    if (options.operator_id) {
      sql += ' AND operator_id = ?';
      params.push(options.operator_id);
    }
    
    if (options.action) {
      sql += ' AND action = ?';
      params.push(options.action);
    }
    
    if (options.start_time) {
      sql += ' AND operation_time >= ?';
      params.push(options.start_time);
    }
    
    if (options.end_time) {
      sql += ' AND operation_time <= ?';
      params.push(options.end_time);
    }
    
    sql += ' ORDER BY operation_time DESC';
    
    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }
    
    const logs = await db.all(sql, ...params);
    
    return logs.map(log => ({
      ...log,
      old_value: log.old_value ? JSON.parse(log.old_value) : null,
      new_value: log.new_value ? JSON.parse(log.new_value) : null,
      changed_fields: log.changed_fields ? JSON.parse(log.changed_fields) : null
    }));
  }
}

module.exports = AuditLog;
