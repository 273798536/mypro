"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasPermission = hasPermission;
exports.requirePermission = requirePermission;
exports.authMiddleware = authMiddleware;
const ROLE_PERMISSIONS = {
    admin: ['*'],
    supervisor: [
        'application:submit',
        'application:withdraw',
        'application:close',
        'application:view',
        'comment:add',
        'queue:view',
        'queue:manual',
        'queue:freeze',
        'deadletter:view',
        'deadletter:requeue',
        'export:all',
        'history:view'
    ],
    operator: [
        'application:submit',
        'application:view',
        'queue:view',
        'export:basic'
    ],
    viewer: [
        'application:view',
        'queue:view'
    ]
};
function hasPermission(user, permission) {
    if (!user)
        return false;
    if (user.role === 'admin')
        return true;
    const permissions = ROLE_PERMISSIONS[user.role] || [];
    return permissions.includes(permission) || permissions.includes('*');
}
function requirePermission(permission) {
    return (req, res, next) => {
        if (!hasPermission(req.user, permission)) {
            res.status(403).json({
                success: false,
                error: '权限不足',
                requiredPermission: permission
            });
            return;
        }
        next();
    };
}
function authMiddleware(req, res, next) {
    const userId = req.headers['x-user-id'];
    const userName = req.headers['x-user-name'];
    const userRole = req.headers['x-user-role'] || 'viewer';
    if (!userId || !userName) {
        res.status(401).json({
            success: false,
            error: '未提供用户身份信息'
        });
        return;
    }
    req.user = {
        userId,
        userName,
        role: userRole,
        permissions: ROLE_PERMISSIONS[userRole] || []
    };
    next();
}
