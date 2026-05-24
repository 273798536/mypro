const jwt = require('jsonwebtoken');
const db = require('../config/database');

const rolePermissions = {
  entry: {
    visibleFields: {
      work_orders: ['id', 'order_no', 'road_section', 'light_count', 'fault_type', 'status', 'description', 'location', 'created_at'],
      inspection_photos: ['id', 'work_order_id', 'photo_url', 'photo_type', 'remark', 'is_abnormal', 'created_at'],
      repair_hotlines: ['id', 'work_order_id', 'caller_name', 'call_time', 'fault_description', 'created_at'],
      spare_parts: ['id', 'work_order_id', 'part_batch_no', 'part_name', 'part_model', 'quantity', 'is_qualified', 'created_at'],
      external_receipts: ['id', 'work_order_id', 'receipt_no', 'receipt_type', 'content', 'has_exception', 'exception_reason', 'created_at']
    },
    actions: ['create', 'read', 'update_own']
  },
  review: {
    visibleFields: {
      work_orders: ['id', 'order_no', 'road_section', 'light_count', 'fault_type', 'status', 'description', 'location', 'entry_user_id', 'created_at', 'updated_at'],
      inspection_photos: ['*'],
      repair_hotlines: ['*'],
      spare_parts: ['*'],
      external_receipts: ['*'],
      bad_data_records: ['*']
    },
    actions: ['create', 'read', 'update', 'review', 'reject']
  },
  supervisor: {
    visibleFields: {
      work_orders: ['*'],
      inspection_photos: ['*'],
      repair_hotlines: ['*'],
      spare_parts: ['*'],
      external_receipts: ['*'],
      bad_data_records: ['*'],
      operation_logs: ['*'],
      reconciliation_records: ['*'],
      users: ['id', 'username', 'name', 'role', 'department', 'created_at']
    },
    actions: ['*']
  },
  readonly: {
    visibleFields: {
      work_orders: ['id', 'order_no', 'road_section', 'light_count', 'fault_type', 'status', 'created_at'],
      inspection_photos: ['id', 'work_order_id', 'photo_url', 'is_abnormal'],
      repair_hotlines: ['id', 'work_order_id', 'call_time'],
      spare_parts: ['id', 'work_order_id', 'part_name', 'is_qualified'],
      external_receipts: ['id', 'work_order_id', 'receipt_no', 'has_exception']
    },
    actions: ['read']
  }
};

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    db.get('SELECT * FROM users WHERE id = ?', [decoded.userId], (err, user) => {
      if (err || !user) {
        return res.status(401).json({ error: '无效的认证令牌' });
      }
      req.user = user;
      next();
    });
  } catch (err) {
    return res.status(401).json({ error: '无效的认证令牌' });
  }
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: '权限不足' });
    }
    next();
  };
};

const requireAction = (action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }
    const permissions = rolePermissions[req.user.role];
    if (!permissions.actions.includes(action) && !permissions.actions.includes('*')) {
      return res.status(403).json({ error: `没有${action}操作权限` });
    }
    next();
  };
};

const filterFields = (data, tableName, userRole) => {
  const permissions = rolePermissions[userRole];
  if (!permissions || !permissions.visibleFields[tableName]) {
    return {};
  }
  
  const allowedFields = permissions.visibleFields[tableName];
  if (allowedFields.includes('*')) {
    return data;
  }
  
  const filtered = {};
  allowedFields.forEach(field => {
    if (data[field] !== undefined) {
      filtered[field] = data[field];
    }
  });
  return filtered;
};

const filterResponse = (tableName) => {
  return (req, res, next) => {
    const originalJson = res.json;
    res.json = function(data) {
      if (req.user && data) {
        if (Array.isArray(data)) {
          data = data.map(item => filterFields(item, tableName, req.user.role));
        } else if (data.data && Array.isArray(data.data)) {
          data.data = data.data.map(item => filterFields(item, tableName, req.user.role));
        } else {
          data = filterFields(data, tableName, req.user.role);
        }
      }
      return originalJson.call(this, data);
    };
    next();
  };
};

module.exports = {
  authenticate,
  requireRole,
  requireAction,
  filterFields,
  filterResponse,
  rolePermissions
};
