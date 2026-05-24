const jwt = require('jsonwebtoken');
const config = require('../config/config');
const db = require('../database/db');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  jwt.verify(token, config.jwtSecret, async (err, user) => {
    if (err) {
      return res.status(403).json({ error: '无效的认证令牌' });
    }

    const dbUser = await db.getSync('SELECT id, username, role FROM users WHERE id = ?', [user.id]);
    if (!dbUser) {
      return res.status(403).json({ error: '用户不存在' });
    }

    req.user = dbUser;
    next();
  });
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: '权限不足' });
    }

    next();
  };
}

async function createAuditLog(userId, action, tableName, recordId, changes, ipAddress) {
  const stmt = db.prepare(`
    INSERT INTO audit_logs (user_id, action, table_name, record_id, changes, ip_address)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  await stmt.run(
    userId,
    action,
    tableName,
    recordId,
    JSON.stringify(changes),
    ipAddress
  );
}

const roleFieldPermissions = {
  data_entry: {
    work_orders: ['id', 'order_no', 'repair_type', 'site_address', 'old_caliber', 'new_caliber', 'shift_record', 'status', 'created_at'],
    queue_items: ['id', 'work_order_id', 'item_type', 'status', 'retry_count', 'last_error', 'created_at'],
    compensation_records: ['id', 'work_order_id', 'material_name', 'quantity', 'unit_price', 'total_amount', 'compensation_type', 'created_at']
  },
  reviewer: {
    work_orders: ['id', 'order_no', 'repair_type', 'site_address', 'old_caliber', 'new_caliber', 'shift_record', 'status', 'created_by', 'created_at', 'updated_at'],
    queue_items: ['id', 'work_order_id', 'item_type', 'payload', 'status', 'retry_count', 'max_retries', 'last_error', 'error_stack', 'next_retry_at', 'created_at', 'updated_at'],
    compensation_records: ['id', 'work_order_id', 'material_name', 'quantity', 'unit_price', 'total_amount', 'compensation_type', 'is_verified', 'created_at']
  },
  supervisor: {
    work_orders: ['*'],
    queue_items: ['*'],
    compensation_records: ['*'],
    audit_logs: ['*'],
    users: ['id', 'username', 'role', 'created_at']
  },
  read_only: {
    work_orders: ['id', 'order_no', 'repair_type', 'site_address', 'status', 'created_at'],
    queue_items: ['id', 'work_order_id', 'item_type', 'status', 'retry_count', 'created_at'],
    compensation_records: ['id', 'work_order_id', 'material_name', 'quantity', 'total_amount', 'is_verified', 'created_at']
  }
};

function filterFieldsByRole(role, tableName, data) {
  const permissions = roleFieldPermissions[role];
  if (!permissions) return {};

  const allowedFields = permissions[tableName];
  if (!allowedFields) return {};

  if (allowedFields.includes('*')) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => {
      const filtered = {};
      allowedFields.forEach(field => {
        if (item && item.hasOwnProperty(field)) {
          filtered[field] = item[field];
        }
      });
      return filtered;
    });
  }

  const filtered = {};
  allowedFields.forEach(field => {
    if (data && data.hasOwnProperty(field)) {
      filtered[field] = data[field];
    }
  });
  return filtered;
}

module.exports = {
  authenticateToken,
  requireRole,
  createAuditLog,
  filterFieldsByRole
};
