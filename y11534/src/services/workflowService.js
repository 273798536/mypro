const db = require('../database/connection');
const config = require('../config');

const recordWorkFlow = (recordType, recordId, action, fromStatus, toStatus, operator, reason = null, changeDetails = null) => {
  return new Promise((resolve, reject) => {
    db.run(`
      INSERT INTO workflow_records (
        record_type, record_id, action, from_status, to_status,
        operator_id, operator_name, operator_role, reason, change_details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      recordType, recordId, action, fromStatus, toStatus,
      operator.id, operator.realName, operator.role, reason,
      changeDetails ? JSON.stringify(changeDetails) : null
    ], function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
};

const getWorkflowHistory = (recordType, recordId) => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT * FROM workflow_records 
      WHERE record_type = ? AND record_id = ?
      ORDER BY created_at DESC
    `, [recordType, recordId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const getWorkflowStats = (recordType, filters = {}) => {
  return new Promise((resolve, reject) => {
    let whereClause = ['record_type = ?'];
    let params = [recordType];
    
    if (filters.branch) {
      whereClause.push('operator_role = ?');
      params.push(filters.role);
    }
    if (filters.startDate) {
      whereClause.push('created_at >= ?');
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      whereClause.push('created_at <= ?');
      params.push(filters.endDate);
    }
    
    const where = whereClause.join(' AND ');
    
    db.all(`
      SELECT 
        action,
        COUNT(*) as count
      FROM workflow_records
      WHERE ${where}
      GROUP BY action
      ORDER BY count DESC
    `, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const stateTransitions = {
  [config.ROLES.DATA_ENTRY]: {
    [config.RECORD_STATUS.DRAFT]: ['submit'],
    [config.RECORD_STATUS.REJECTED]: ['submit']
  },
  [config.ROLES.REVIEWER]: {
    [config.RECORD_STATUS.SUBMITTED]: ['approve', 'reject', 'second_confirm'],
    [config.RECORD_STATUS.SECOND_CONFIRM]: ['approve', 'reject']
  },
  [config.ROLES.SUPERVISOR]: {
    '*': ['approve', 'reject', 'second_confirm', 'archive']
  }
};

const canPerformAction = (userRole, currentStatus, action) => {
  const roleTransitions = stateTransitions[userRole];
  if (!roleTransitions) return false;
  
  if (roleTransitions['*']) {
    return roleTransitions['*'].includes(action);
  }
  
  const statusTransitions = roleTransitions[currentStatus];
  return statusTransitions ? statusTransitions.includes(action) : false;
};

const getNextStatus = (action) => {
  const actionMap = {
    'submit': config.RECORD_STATUS.SUBMITTED,
    'approve': config.RECORD_STATUS.APPROVED,
    'reject': config.RECORD_STATUS.REJECTED,
    'second_confirm': config.RECORD_STATUS.SECOND_CONFIRM,
    'archive': config.RECORD_STATUS.ARCHIVED,
    'save_draft': config.RECORD_STATUS.DRAFT
  };
  return actionMap[action];
};

module.exports = {
  recordWorkFlow,
  getWorkflowHistory,
  getWorkflowStats,
  canPerformAction,
  getNextStatus
};
