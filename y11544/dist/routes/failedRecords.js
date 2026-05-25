"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const failedRecordService_1 = require("../services/failedRecordService");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const types_1 = require("../types");
const router = (0, express_1.Router)();
router.get('/', (0, roleMiddleware_1.roleAuth)([types_1.UserRole.MANAGER, types_1.UserRole.AUDITOR, types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const recordType = req.query.type;
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 50;
        const result = await failedRecordService_1.failedRecordService.getFailedRecords(recordType, page, pageSize);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/stats', (0, roleMiddleware_1.roleAuth)([types_1.UserRole.MANAGER, types_1.UserRole.AUDITOR, types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const stats = await failedRecordService_1.failedRecordService.getFailedRecordStats();
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=failedRecords.js.map