"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleAuth = roleAuth;
exports.getRoleFromRequest = getRoleFromRequest;
exports.getUserIdFromRequest = getUserIdFromRequest;
const types_1 = require("../types");
function roleAuth(allowedRoles) {
    return (req, res, next) => {
        const role = req.headers['x-user-role'] || types_1.UserRole.OPERATOR;
        if (!allowedRoles.includes(role)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: `Role ${role} does not have permission to access this resource`
            });
        }
        req.user = {
            id: req.headers['x-user-id'] || 'anonymous',
            role
        };
        next();
    };
}
function getRoleFromRequest(req) {
    return req.headers['x-user-role'] || types_1.UserRole.OPERATOR;
}
function getUserIdFromRequest(req) {
    return req.headers['x-user-id'] || 'anonymous';
}
//# sourceMappingURL=roleMiddleware.js.map