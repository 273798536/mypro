const db = require('../config/database');

const calculateDiff = (before, after) => {
  const diff = {};
  const beforeObj = before || {};
  const afterObj = after || {};
  const allKeys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);
  
  allKeys.forEach(key => {
    if (beforeObj[key] !== afterObj[key]) {
      diff[key] = {
        before: beforeObj[key],
        after: afterObj[key]
      };
    }
  });
  
  return diff;
};

const logOperation = (operationType, tableName, recordId, userId, userRole, beforeData, afterData, ipAddress = '') => {
  return new Promise((resolve, reject) => {
    const diff = calculateDiff(beforeData, afterData);
    const diffSummary = Object.keys(diff).length > 0 ? JSON.stringify(diff) : null;
    
    db.run(
      `INSERT INTO operation_logs 
       (operation_type, table_name, record_id, user_id, user_role, before_data, after_data, diff_summary, ip_address) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        operationType,
        tableName,
        recordId,
        userId,
        userRole,
        beforeData ? JSON.stringify(beforeData) : null,
        afterData ? JSON.stringify(afterData) : null,
        diffSummary,
        ipAddress
      ],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
};

const getOperationLogs = (filters = {}) => {
  return new Promise((resolve, reject) => {
    let sql = 'SELECT * FROM operation_logs WHERE 1=1';
    const params = [];
    
    if (filters.table_name) {
      sql += ' AND table_name = ?';
      params.push(filters.table_name);
    }
    if (filters.record_id) {
      sql += ' AND record_id = ?';
      params.push(filters.record_id);
    }
    if (filters.user_id) {
      sql += ' AND user_id = ?';
      params.push(filters.user_id);
    }
    if (filters.operation_type) {
      sql += ' AND operation_type = ?';
      params.push(filters.operation_type);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }
    
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

const getRecordHistory = (tableName, recordId) => {
  return getOperationLogs({ table_name: tableName, record_id: recordId });
};

module.exports = {
  logOperation,
  getOperationLogs,
  getRecordHistory,
  calculateDiff
};
