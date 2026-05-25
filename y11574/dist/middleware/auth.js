"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockUsers = void 0;
exports.authenticate = authenticate;
exports.requirePermission = requirePermission;
exports.filterFieldsByRole = filterFieldsByRole;
exports.filterListByRole = filterListByRole;
const types_1 = require("../types");
const roles_1 = require("../config/roles");
exports.mockUsers = {
    'entry-1': { id: 'entry-1', name: '张三-录入员', role: types_1.UserRole.DATA_ENTRY },
    'reviewer-1': { id: 'reviewer-1', name: '李四-复核员', role: types_1.UserRole.REVIEWER },
    'supervisor-1': { id: 'supervisor-1', name: '王五-主管', role: types_1.UserRole.SUPERVISOR },
    'readonly-1': { id: 'readonly-1', name: '赵六-只读用户', role: types_1.UserRole.READ_ONLY }
};
function authenticate(req, res, next) {
    const userId = req.headers['x-user-id'];
    if (!userId) {
        return res.status(401).json({ error: 'Missing user ID' });
    }
    const user = exports.mockUsers[userId];
    if (!user) {
        return res.status(401).json({ error: 'Invalid user ID' });
    }
    req.user = user;
    next();
}
function requirePermission(action) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!(0, roles_1.hasPermission)(req.user.role, action)) {
            return res.status(403).json({
                error: 'Permission denied',
                requiredAction: action,
                userRole: req.user.role
            });
        }
        next();
    };
}
function filterFieldsByRole(data, role) {
    const permissions = (0, roles_1.getRolePermissions)(role);
    const result = {};
    for (const field of permissions.visibleFields) {
        if (field in data) {
            result[field] = data[field];
        }
    }
    return result;
}
function filterListByRole(items, role) {
    return items.map(item => filterFieldsByRole(item, role));
}
