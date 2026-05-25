"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const roleViewService_1 = require("../services/roleViewService");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const types_1 = require("../types");
const router = (0, express_1.Router)();
router.get('/', (0, roleMiddleware_1.roleAuth)([types_1.UserRole.OPERATOR, types_1.UserRole.REVIEWER, types_1.UserRole.MANAGER, types_1.UserRole.AUDITOR, types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const role = (0, roleMiddleware_1.getRoleFromRequest)(req);
        const dashboard = await roleViewService_1.roleViewService.getRoleDashboard(role);
        res.json(dashboard);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=dashboard.js.map