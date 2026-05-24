const db = require('../database/connection');

const logAction = (user, action, module, recordId = null, ip = null, userAgent = null, params = null, status = 'success') => {
  return new Promise((resolve, reject) => {
    db.run(`
      INSERT INTO audit_logs (user_id, username, action, module, record_id, ip_address, user_agent, request_params, response_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      user?.id,
      user?.username,
      action,
      module,
      recordId,
      ip,
      userAgent,
      params ? JSON.stringify(params) : null,
      status
    ], function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
};

const getAuditLogs = (filters = {}, page = 1, pageSize = 50) => {
  return new Promise((resolve, reject) => {
    let whereClause = [];
    let params = [];
    
    if (filters.userId) {
      whereClause.push('user_id = ?');
      params.push(filters.userId);
    }
    if (filters.module) {
      whereClause.push('module = ?');
      params.push(filters.module);
    }
    if (filters.action) {
      whereClause.push('action = ?');
      params.push(filters.action);
    }
    if (filters.startDate) {
      whereClause.push('created_at >= ?');
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      whereClause.push('created_at <= ?');
      params.push(filters.endDate);
    }
    
    const where = whereClause.length ? `WHERE ${whereClause.join(' AND ')}` : '';
    const offset = (page - 1) * pageSize;
    
    db.all(`
      SELECT * FROM audit_logs 
      ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, pageSize, offset], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const getAuditStats = (filters = {}) => {
  return new Promise((resolve, reject) => {
    let whereClause = [];
    let params = [];
    
    if (filters.module) {
      whereClause.push('module = ?');
      params.push(filters.module);
    }
    if (filters.startDate) {
      whereClause.push('created_at >= ?');
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      whereClause.push('created_at <= ?');
      params.push(filters.endDate);
    }
    
    const where = whereClause.length ? `WHERE ${whereClause.join(' AND ')}` : '';
    
    db.get(`
      SELECT 
        COUNT(*) as total_count,
        COUNT(DISTINCT user_id) as user_count,
        COUNT(DISTINCT module) as module_count
      FROM audit_logs
      ${where}
    `, params, (err, stats) => {
      if (err) reject(err);
      else resolve(stats);
    });
  });
};

module.exports = {
  logAction,
  getAuditLogs,
  getAuditStats
};
