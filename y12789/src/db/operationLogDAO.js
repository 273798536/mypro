const { runQuery, runInsert, runUpdate } = require('../db/database');

const operationLogDAO = {
  create(log) {
    const id = runInsert(
      `INSERT INTO operation_logs (operation_type, target_type, target_id, operator, detail)
       VALUES (?, ?, ?, ?, ?)`,
      [log.operation_type, log.target_type, log.target_id || null, log.operator || null, log.detail || null]
    );
    return id;
  },

  list({ target_type = null, target_id = null, operation_type = null, page = 1, pageSize = 50 } = {}) {
    let sql = 'SELECT * FROM operation_logs';
    const params = [];
    const conditions = [];
    if (target_type) {
      conditions.push('target_type = ?');
      params.push(target_type);
    }
    if (target_id !== null && target_id !== undefined) {
      conditions.push('target_id = ?');
      params.push(target_id);
    }
    if (operation_type) {
      conditions.push('operation_type = ?');
      params.push(operation_type);
    }
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, (page - 1) * pageSize);
    return runQuery(sql, params);
  },

  count({ target_type = null, target_id = null, operation_type = null } = {}) {
    let sql = 'SELECT COUNT(*) as count FROM operation_logs';
    const params = [];
    const conditions = [];
    if (target_type) {
      conditions.push('target_type = ?');
      params.push(target_type);
    }
    if (target_id !== null && target_id !== undefined) {
      conditions.push('target_id = ?');
      params.push(target_id);
    }
    if (operation_type) {
      conditions.push('operation_type = ?');
      params.push(operation_type);
    }
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    const rows = runQuery(sql, params);
    return rows[0].count;
  }
};

module.exports = operationLogDAO;
