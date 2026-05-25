"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const summaryService_1 = require("../services/summaryService");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/role-view', (0, auth_1.requirePermission)('view_list'), async (req, res) => {
    const user = req.user;
    const summary = await summaryService_1.summaryService.getRoleViewSummary(user);
    res.json({
        success: true,
        data: summary
    });
});
router.get('/change-reasons', (0, auth_1.requirePermission)('view_change_reasons'), async (req, res) => {
    const reasons = await summaryService_1.summaryService.getChangeReasons();
    res.json({
        success: true,
        data: reasons
    });
});
router.get('/sensitive-handling', (0, auth_1.requirePermission)('view_sensitive_handling'), async (req, res) => {
    const handling = await summaryService_1.summaryService.getSensitiveFieldHandling();
    res.json({
        success: true,
        data: handling
    });
});
router.get('/consistency-report', (0, auth_1.requirePermission)('view_role_summary'), async (req, res) => {
    const report = await summaryService_1.summaryService.getDataConsistencyReport();
    res.json({
        success: true,
        data: report
    });
});
router.get('/dirty-stats', (0, auth_1.requirePermission)('view_list'), async (req, res) => {
    const stats = await summaryService_1.summaryService.getDirtyRecordStats();
    res.json({
        success: true,
        data: stats
    });
});
exports.default = router;
