const jwt = require('jsonwebtoken');
const { User, ROLES, ROLE_PERMISSIONS } = require('../models/User');
const { OperationLog } = require('../models/OperationLog');
const _ = require('lodash');

const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: '未提供认证令牌' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: '用户不存在或已被禁用' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: '认证失败', details: error.message });
  }
};

const authorize = (...allowedRoles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      try {
        const baseUrlParts = req.baseUrl.split('/');
        const targetType = baseUrlParts[baseUrlParts.length - 1] || 'unknown';
        const targetId = req.params.id || null;
        const operationType = req.method.toLowerCase() + '_' + targetType;
        
        await OperationLog.create({
          operationType: operationType,
          operator: req.user._id,
          operatorName: req.user.name,
          operatorRole: req.user.role,
          targetType,
          targetId,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          success: false,
          errorMessage: `权限拦截: 角色[${req.user.role}]无权限执行此操作，需要角色: ${allowedRoles.join(', ')}`
        });
      } catch (logErr) {
        console.error('记录权限拦截日志失败:', logErr.message);
      }
      
      return res.status(403).json({ error: '权限不足，禁止访问' });
    }

    next();
  };
};

const requirePermission = (action) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    const permissions = ROLE_PERMISSIONS[req.user.role];
    if (!permissions.canEdit.includes(action) && !permissions.canEdit.includes('*')) {
      try {
        const baseUrlParts = req.baseUrl.split('/');
        const targetType = baseUrlParts[baseUrlParts.length - 1] || 'unknown';
        const targetId = req.params.id || null;
        
        await OperationLog.create({
          operationType: action,
          operator: req.user._id,
          operatorName: req.user.name,
          operatorRole: req.user.role,
          targetType,
          targetId,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          success: false,
          errorMessage: `权限拦截: 角色[${req.user.role}]无权限执行操作: ${action}`
        });
      } catch (logErr) {
        console.error('记录权限拦截日志失败:', logErr.message);
      }
      
      return res.status(403).json({ error: `没有权限执行: ${action}` });
    }

    next();
  };
};

const filterFieldsByRole = (data, role, fieldType = 'visible') => {
  const permissions = ROLE_PERMISSIONS[role];
  const allowedFields = permissions.fields[fieldType];

  if (allowedFields.includes('*')) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => _.pick(item, allowedFields));
  }

  return _.pick(data, allowedFields);
};

const canEditField = (role, field) => {
  const permissions = ROLE_PERMISSIONS[role];
  const editableFields = permissions.fields.editable;
  return editableFields.includes('*') || editableFields.includes(field);
};

const cityDataFilter = (req, res, next) => {
  if (!req.user) {
    return next();
  }

  if (req.user.role !== ROLES.SUPERVISOR) {
    req.query.city = req.user.city;
  }
  
  next();
};

const maskSensitiveData = (data, fieldsToMask = ['customerPhone', 'customerName']) => {
  const maskField = (value) => {
    if (!value) return value;
    if (typeof value === 'string' && value.length >= 7) {
      return value.substring(0, 3) + '****' + value.substring(value.length - 4);
    }
    return '***';
  };

  if (Array.isArray(data)) {
    return data.map(item => {
      const masked = { ...item };
      fieldsToMask.forEach(field => {
        if (masked[field]) {
          masked[field] = maskField(masked[field]);
        }
      });
      return masked;
    });
  }

  const masked = { ...data };
  fieldsToMask.forEach(field => {
    if (masked[field]) {
      masked[field] = maskField(masked[field]);
    }
  });
  return masked;
};

module.exports = {
  authenticate,
  authorize,
  requirePermission,
  filterFieldsByRole,
  canEditField,
  cityDataFilter,
  maskSensitiveData
};
