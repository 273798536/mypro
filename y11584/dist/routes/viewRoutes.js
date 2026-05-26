"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const roleViewService_1 = require("../services/roleViewService");
const schema_1 = require("../database/schema");
const router = (0, express_1.Router)();
router.get('/:role', async (req, res) => {
    try {
        const { role } = req.params;
        const { storeId, startTime, endTime } = req.query;
        const validRoles = Object.values(schema_1.RoleType);
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: '无效的角色类型' });
        }
        const view = await (0, roleViewService_1.getRoleBasedView)(role, {
            storeId: storeId,
            startTime: startTime ? parseInt(startTime) : undefined,
            endTime: endTime ? parseInt(endTime) : undefined
        });
        res.json(view);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;
