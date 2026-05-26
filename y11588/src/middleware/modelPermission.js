const { getDB } = require('../models/storage');
const { hasPermission } = require('./auth');

function getUserRole(userId) {
  const db = getDB();
  const user = db.users[userId];
  return user ? user.role : null;
}

function checkPermission(userId, action, entityType) {
  const role = getUserRole(userId);
  if (!role) {
    return { success: false, error: `用户不存在: ${userId}`, code: 'USER_NOT_FOUND' };
  }
  if (!hasPermission(role, action, entityType)) {
    return { success: false, error: `权限不足: ${role} 无法 ${action} ${entityType}`, code: 'INSUFFICIENT_PERMISSION' };
  }
  return { success: true };
}

function wrapWithPermission(originalFn, action, entityType) {
  return function(...args) {
    const userId = args[args.length - 1];
    const permCheck = checkPermission(userId, action, entityType);
    if (!permCheck.success) {
      return permCheck;
    }
    return originalFn.apply(this, args);
  };
}

module.exports = {
  getUserRole,
  checkPermission,
  wrapWithPermission
};
