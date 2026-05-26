const { getDB } = require('../models/storage');

const ROLES = {
  OPERATOR: 'operator',
  REVIEWER: 'reviewer',
  DIRECTOR: 'director',
  VIEWER: 'viewer'
};

const PERMISSIONS = {
  [ROLES.OPERATOR]: {
    canCreate: ['contract', 'paymentNode', 'acceptanceEmail', 'confirmation'],
    canRead: ['contract', 'paymentNode', 'acceptanceEmail', 'confirmation', 'failedRecords'],
    canUpdate: ['contract', 'paymentNode'],
    canDelete: [],
    canReview: [],
    canApprove: [],
    canFreeze: [],
    canExport: true,
    visibleFields: {
      contract: ['id', 'contractName', 'contractNumber', 'partyA', 'partyB', 'totalAmount', 'currency', 'status', 'createdAt', 'isSupplement', 'parentContractId', 'idempotencyKey', 'version'],
      paymentNode: ['id', 'contractId', 'nodeName', 'dueAmount', 'dueDate', 'status', 'sequence', 'batchId', 'idempotencyKey'],
      acceptanceEmail: ['id', 'contractId', 'paymentNodeId', 'emailSubject', 'emailFrom', 'emailDate', 'status', 'idempotencyKey'],
      confirmation: ['id', 'contractId', 'paymentNodeId', 'confirmationType', 'confirmingParty', 'status', 'idempotencyKey', 'adjustedDueAmount', 'originalDueAmount']
    }
  },
  [ROLES.REVIEWER]: {
    canCreate: ['contract', 'paymentNode', 'acceptanceEmail', 'confirmation'],
    canRead: ['contract', 'paymentNode', 'acceptanceEmail', 'confirmation', 'failedRecords', 'versionHistory'],
    canUpdate: ['contract', 'paymentNode', 'acceptanceEmail'],
    canDelete: [],
    canReview: ['acceptanceEmail'],
    canApprove: [],
    canFreeze: [],
    canExport: true,
    visibleFields: {
      contract: ['*'],
      paymentNode: ['*'],
      acceptanceEmail: ['*'],
      confirmation: ['*']
    }
  },
  [ROLES.DIRECTOR]: {
    canCreate: ['*'],
    canRead: ['*'],
    canUpdate: ['*'],
    canDelete: ['*'],
    canReview: ['acceptanceEmail'],
    canApprove: ['confirmation'],
    canFreeze: ['contract'],
    canExport: true,
    visibleFields: {
      '*': ['*']
    }
  },
  [ROLES.VIEWER]: {
    canCreate: [],
    canRead: ['contract', 'paymentNode', 'acceptanceEmail', 'confirmation'],
    canUpdate: [],
    canDelete: [],
    canReview: [],
    canApprove: [],
    canFreeze: [],
    canExport: false,
    visibleFields: {
      contract: ['id', 'contractName', 'partyA', 'partyB', 'totalAmount', 'status'],
      paymentNode: ['id', 'contractId', 'nodeName', 'dueAmount', 'status'],
      acceptanceEmail: ['id', 'contractId', 'emailSubject', 'status'],
      confirmation: ['id', 'contractId', 'confirmationType', 'status']
    }
  }
};

function getRolePermissions(role) {
  return PERMISSIONS[role] || PERMISSIONS[ROLES.VIEWER];
}

function hasPermission(role, action, entityType) {
  const perms = getRolePermissions(role);
  const actionPerms = perms[action] || [];
  
  if (actionPerms.includes('*')) return true;
  if (actionPerms.includes(entityType)) return true;
  return false;
}

function filterFields(role, entityType, data) {
  if (!data) return data;
  const perms = getRolePermissions(role);
  const fields = perms.visibleFields[entityType] || perms.visibleFields['*'] || [];
  
  if (fields.includes('*')) return data;
  
  const filtered = {};
  fields.forEach(f => {
    if (data[f] !== undefined) {
      filtered[f] = data[f];
    }
  });
  return filtered;
}

function filterList(role, entityType, list) {
  return list.map(item => filterFields(role, entityType, item));
}

function authMiddleware(req, res, next) {
  const userId = req.headers['x-user-id'] || 'viewer';
  const db = getDB();
  const user = db.users[userId];
  
  if (!user) {
    return res.status(401).json({ success: false, error: '用户不存在', code: 'USER_NOT_FOUND' });
  }
  
  req.user = user;
  req.userRole = user.role;
  req.permissions = getRolePermissions(user.role);
  
  next();
}

function requirePermission(action, entityType) {
  return (req, res, next) => {
    if (!hasPermission(req.userRole, action, entityType)) {
      return res.status(403).json({
        success: false,
        error: `权限不足: ${req.userRole} 无法 ${action} ${entityType}`,
        code: 'INSUFFICIENT_PERMISSION'
      });
    }
    next();
  };
}

module.exports = {
  ROLES,
  PERMISSIONS,
  getRolePermissions,
  hasPermission,
  filterFields,
  filterList,
  authMiddleware,
  requirePermission
};
