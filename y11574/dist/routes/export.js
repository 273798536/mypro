"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const exportService_1 = require("../services/exportService");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/csv', (0, auth_1.requirePermission)('export_masked'), async (req, res) => {
    const user = req.user;
    const { status, startDate, endDate, department, isMasked = true } = req.body;
    try {
        const { csv, exportLogId } = await exportService_1.exportService.exportToCSV({
            status: status,
            startDate,
            endDate,
            department
        }, user, isMasked);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="liability_records_${Date.now()}.csv"`);
        res.setHeader('X-Export-Log-Id', exportLogId);
        res.send('\uFEFF' + csv);
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
router.get('/history', (0, auth_1.requirePermission)('view_history'), async (req, res) => {
    const user = req.user;
    const { limit = '20' } = req.query;
    const history = await exportService_1.exportService.getExportHistory(user, parseInt(limit, 10));
    res.json({
        success: true,
        data: history
    });
});
router.get('/verify/:exportId', (0, auth_1.requirePermission)('view_role_summary'), async (req, res) => {
    try {
        const result = await exportService_1.exportService.verifyExportConsistency(req.params.exportId);
        res.json({
            success: true,
            data: result
        });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
exports.default = router;
