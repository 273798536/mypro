"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasPermission = hasPermission;
exports.filterFieldsByRole = filterFieldsByRole;
exports.requirePermission = requirePermission;
exports.authMiddleware = authMiddleware;
const config_1 = require("../config");
const ROLE_PERMISSIONS = {
    [config_1.CONFIG.ROLES.DATA_ENTRY]: [
        'batch:create',
        'batch:update',
        'batch:submit',
        'record:create',
        'record:update',
        'attachment:upload',
        'attachment:view',
        'batch:view',
        'record:view'
    ],
    [config_1.CONFIG.ROLES.REVIEWER]: [
        'batch:view',
        'record:view',
        'attachment:view',
        'batch:review',
        'record:review',
        'record:resolve',
        'batch:freeze'
    ],
    [config_1.CONFIG.ROLES.SUPERVISOR]: [
        'batch:*',
        'record:*',
        'attachment:*',
        'audit:view',
        'export:*'
    ],
    [config_1.CONFIG.ROLES.READ_ONLY]: [
        'batch:view',
        'record:view',
        'attachment:view'
    ]
};
const FIELD_VISIBILITY = {
    [config_1.CONFIG.ROLES.DATA_ENTRY]: {
        batch: ['id', 'batchNo', 'title', 'recordType', 'storeId', 'status', 'totalAmount', 'totalCount', 'validCount', 'dirtyCount', 'createdBy', 'createdAt', 'attachments'],
        record: ['id', 'batchId', 'recordType', 'storeId', 'memberId', 'memberName', 'phone', 'amount', 'quantity', 'transactionDate', 'operator', 'status', 'source', 'createdAt']
    },
    [config_1.CONFIG.ROLES.REVIEWER]: {
        batch: ['id', 'batchNo', 'title', 'recordType', 'storeId', 'status', 'totalAmount', 'totalCount', 'validCount', 'dirtyCount', 'createdBy', 'reviewedBy', 'reviewedAt', 'frozenRemark', 'frozenAt', 'frozenBy', 'createdAt', 'attachments', 'statusHistories'],
        record: ['id', 'batchId', 'recordType', 'storeId', 'memberId', 'memberName', 'phone', 'amount', 'quantity', 'transactionDate', 'operator', 'originalContent', 'status', 'dirtyType', 'dirtyRemark', 'resolveRemark', 'source', 'createdBy', 'createdAt', 'statusHistories']
    },
    [config_1.CONFIG.ROLES.SUPERVISOR]: {
        batch: ['*'],
        record: ['*']
    },
    [config_1.CONFIG.ROLES.READ_ONLY]: {
        batch: ['id', 'batchNo', 'title', 'recordType', 'storeId', 'status', 'totalAmount', 'totalCount', 'validCount', 'dirtyCount', 'createdAt'],
        record: ['id', 'batchId', 'recordType', 'storeId', 'memberId', 'memberName', 'amount', 'status', 'createdAt']
    }
};
function hasPermission(role, permission) {
    const rolePerms = ROLE_PERMISSIONS[role] || [];
    if (rolePerms.includes('*'))
        return true;
    if (rolePerms.includes(permission))
        return true;
    const [resource, action] = permission.split(':');
    return rolePerms.includes(`${resource}:*`);
}
function filterFieldsByRole(data, role, entityType) {
    const allowedFields = FIELD_VISIBILITY[role][entityType];
    if (allowedFields.includes('*'))
        return data;
    const filtered = {};
    for (const field of allowedFields) {
        if (field in data) {
            filtered[field] = data[field];
        }
    }
    return filtered;
}
function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: '未授权访问' });
        }
        if (!hasPermission(req.user.role, permission)) {
            return res.status(403).json({ error: '权限不足' });
        }
        next();
    };
}
function authMiddleware(req, res, next) {
    const userId = req.headers['x-user-id'];
    const username = req.headers['x-username'];
    const role = req.headers['x-role'];
    const storeId = req.headers['x-store-id'];
    if (!userId || !username || !role) {
        return res.status(401).json({ error: '缺少认证信息' });
    }
    if (!Object.values(config_1.CONFIG.ROLES).includes(role)) {
        return res.status(400).json({ error: '无效的角色' });
    }
    req.user = { id: userId, username, role, storeId };
    next();
}
//# sourceMappingURL=auth.js.map