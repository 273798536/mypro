const db = require('../models/database');

const ROLES = {
  ENTRY: 'entry',
  REVIEW: 'review',
  SUPERVISOR: 'supervisor',
  READONLY: 'readonly'
};

const PERMISSIONS = {
  [ROLES.ENTRY]: {
    canView: ['id', 'event_key', 'source_type', 'event_type', 'room_id', 'room_name', 'booking_id', 'start_time', 'end_time', 'status', 'retry_count', 'has_tea_service', 'has_equipment', 'created_at'],
    canEdit: ['raw_data', 'source_file'],
    canAction: ['submit_event', 'supplement']
  },
  [ROLES.REVIEW]: {
    canView: ['*'],
    canEdit: ['status', 'review_notes'],
    canAction: ['submit_event', 'supplement', 'review', 'manual_retry']
  },
  [ROLES.SUPERVISOR]: {
    canView: ['*'],
    canEdit: ['*'],
    canAction: ['submit_event', 'supplement', 'review', 'manual_retry', 'approve', 'close', 'post_compensation', 'dead_letter', 'restore_dead_letter']
  },
  [ROLES.READONLY]: {
    canView: ['id', 'event_key', 'source_type', 'event_type', 'room_id', 'room_name', 'status', 'retry_count', 'created_at'],
    canEdit: [],
    canAction: []
  }
};

function authenticate(req, res, next) {
  const username = req.headers['x-user-token'] || req.query.user;
  
  if (!username) {
    return res.status(401).json({ error: '未提供用户凭证，使用 x-user-token header 或 ?user= 参数' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  
  if (!user) {
    return res.status(401).json({ error: '用户不存在' });
  }

  req.user = user;
  req.permissions = PERMISSIONS[user.role];
  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: '权限不足，需要角色: ' + allowedRoles.join(', ') });
    }
    next();
  };
}

function requireAction(action) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }
    if (!req.permissions.canAction.includes(action)) {
      return res.status(403).json({ error: `无权限执行操作: ${action}` });
    }
    next();
  };
}

function filterFields(data, role) {
  const perms = PERMISSIONS[role];
  if (perms.canView.includes('*')) {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => filterFields(item, role));
  }
  
  const filtered = {};
  perms.canView.forEach(field => {
    if (data.hasOwnProperty(field)) {
      filtered[field] = data[field];
    }
  });
  return filtered;
}

module.exports = {
  authenticate,
  requireRole,
  requireAction,
  filterFields,
  ROLES,
  PERMISSIONS
};
