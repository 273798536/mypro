"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.requirePermission = exports.authenticate = exports.hasPermission = void 0;
const enums_1 = require("../types/enums");
const ROLE_PERMISSIONS = {
    [enums_1.UserRole.ENGINEER]: [
        'ledger:create',
        'ledger:update',
        'ledger:submit',
        'ledger:read',
        'ledger:export',
        'history:read',
    ],
    [enums_1.UserRole.SERVICE_MANAGER]: [
        'ledger:create',
        'ledger:update',
        'ledger:submit',
        'ledger:confirm',
        'ledger:reject',
        'ledger:read',
        'ledger:export',
        'ledger:list',
        'history:read',
        'failed:read',
        'stats:read',
    ],
    [enums_1.UserRole.AUDITOR]: [
        'ledger:audit',
        'ledger:read',
        'ledger:export',
        'ledger:list',
        'history:read',
        'history:compare',
        'stats:read',
    ],
    [enums_1.UserRole.ADMIN]: [
        'ledger:*',
        'history:*',
        'failed:*',
        'stats:*',
        'export:*',
    ],
};
const hasPermission = (userRole, permission) => {
    const permissions = ROLE_PERMISSIONS[userRole] || [];
    return permissions.some((p) => {
        if (p === permission)
            return true;
        if (p.endsWith(':*')) {
            const prefix = p.slice(0, -1);
            return permission.startsWith(prefix);
        }
        return false;
    });
};
exports.hasPermission = hasPermission;
const authenticate = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    const userName = req.headers['x-user-name'];
    const userRole = req.headers['x-user-role'];
    if (!userId || !userRole) {
        res.status(401).json({ error: '缺少用户认证信息' });
        return;
    }
    if (!Object.values(enums_1.UserRole).includes(userRole)) {
        res.status(400).json({ error: '无效的用户角色' });
        return;
    }
    req.user = {
        id: userId,
        name: userName || userId,
        role: userRole,
    };
    next();
};
exports.authenticate = authenticate;
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: '未认证' });
            return;
        }
        if (!(0, exports.hasPermission)(req.user.role, permission)) {
            res.status(403).json({ error: '权限不足' });
            return;
        }
        next();
    };
};
exports.requirePermission = requirePermission;
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: '未认证' });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({ error: '权限不足' });
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
//# sourceMappingURL=auth.js.map