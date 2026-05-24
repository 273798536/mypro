const ROLES = {
  ADMIN: 'ADMIN',
  PURCHASE_STAFF: 'PURCHASE_STAFF',
  WAREHOUSE_STAFF: 'WAREHOUSE_STAFF',
  QUALITY_STAFF: 'QUALITY_STAFF',
  FINANCE_STAFF: 'FINANCE_STAFF',
  SUPPLIER: 'SUPPLIER'
};

const PERMISSIONS = {
  CREATE_APPLICATION: [ROLES.ADMIN, ROLES.PURCHASE_STAFF, ROLES.WAREHOUSE_STAFF],
  CREATE_BATCH: [ROLES.ADMIN, ROLES.WAREHOUSE_STAFF],
  UPLOAD_ATTACHMENT: [ROLES.ADMIN, ROLES.WAREHOUSE_STAFF, ROLES.QUALITY_STAFF],
  UPLOAD_APPROVAL_EMAIL: [ROLES.ADMIN, ROLES.PURCHASE_STAFF],
  QUALITY_INSPECTION: [ROLES.ADMIN, ROLES.QUALITY_STAFF],
  REVIEW: [ROLES.ADMIN, ROLES.PURCHASE_STAFF],
  REVIEW_REVISE: [ROLES.ADMIN, ROLES.PURCHASE_STAFF],
  FREEZE: [ROLES.ADMIN, ROLES.PURCHASE_STAFF, ROLES.FINANCE_STAFF],
  UNFREEZE: [ROLES.ADMIN, ROLES.PURCHASE_STAFF],
  SETTLE: [ROLES.ADMIN, ROLES.FINANCE_STAFF],
  ARCHIVE: [ROLES.ADMIN, ROLES.FINANCE_STAFF],
  MEMBER_CANCEL: [ROLES.ADMIN, ROLES.PURCHASE_STAFF],
  VIEW_EXCEPTIONS: [ROLES.ADMIN, ROLES.PURCHASE_STAFF],
  EXPORT: [ROLES.ADMIN, ROLES.PURCHASE_STAFF, ROLES.FINANCE_STAFF],
  VIEW_HISTORY: [ROLES.ADMIN, ROLES.PURCHASE_STAFF, ROLES.WAREHOUSE_STAFF],
  VIEW_FAILED_RECORDS: [ROLES.ADMIN, ROLES.PURCHASE_STAFF],
  AUTO_CHECK: [ROLES.ADMIN, ROLES.PURCHASE_STAFF]
};

function authMiddleware(requiredPermission) {
  return (req, res, next) => {
    const userRole = req.headers['x-user-role'];
    const userId = req.headers['x-user-id'];

    if (!userRole || !userId) {
      return res.status(401).json({
        success: false,
        error: '未授权访问: 缺少用户信息'
      });
    }

    const allowedRoles = PERMISSIONS[requiredPermission];
    if (!allowedRoles) {
      return res.status(403).json({
        success: false,
        error: '权限配置错误'
      });
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: `权限不足: 需要 ${allowedRoles.join(' 或 ')} 角色`,
        current_role: userRole
      });
    }

    req.user = {
      id: userId,
      role: userRole
    };

    next();
  };
}

function getUserId(req) {
  return req.headers['x-user-id'] || 'system';
}

module.exports = {
  authMiddleware,
  ROLES,
  PERMISSIONS,
  getUserId
};
