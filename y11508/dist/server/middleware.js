"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.requirePermission = requirePermission;
exports.filterResponse = filterResponse;
exports.checkStatusTransition = checkStatusTransition;
const types_1 = require("../types");
const permissions_1 = require("../permissions");
function authMiddleware(req, res, next) {
    const username = req.headers['x-user'];
    if (!username) {
        res.status(401).json({
            success: false,
            error: '未提供用户身份'
        });
        return;
    }
    const mockUsers = {
        admin: { role: types_1.Role.SUPERVISOR, department: '设备科' },
        reviewer01: { role: types_1.Role.REVIEWER, department: '设备科' },
        entry01: { role: types_1.Role.DATA_ENTRY, department: '设备科' },
        entry02: { role: types_1.Role.DATA_ENTRY, department: '检验科' },
        viewer01: { role: types_1.Role.READ_ONLY, department: '院感科' },
        nurse_head: { role: types_1.Role.SUPERVISOR, department: '护理部' }
    };
    const userInfo = mockUsers[username] || { role: types_1.Role.READ_ONLY, department: '未知' };
    req.user = {
        id: username,
        username,
        role: userInfo.role,
        department: userInfo.department
    };
    next();
}
function requirePermission(entityType, action) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: '未授权'
            });
            return;
        }
        const permissions = permissions_1.rolePermissions[req.user.role][entityType];
        const actionPerm = permissions.actions[action];
        if (!actionPerm || !actionPerm.allowed) {
            res.status(403).json({
                success: false,
                error: '权限不足'
            });
            return;
        }
        next();
    };
}
function filterResponse(data, role, entityType) {
    return (0, permissions_1.filterFieldsByRole)(data, role, entityType);
}
function checkStatusTransition(fromStatus, toStatus, role) {
    return (0, permissions_1.canTransitionStatus)(fromStatus, toStatus, role);
}
//# sourceMappingURL=middleware.js.map