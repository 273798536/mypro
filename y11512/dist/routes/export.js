"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ExportService_1 = require("../services/ExportService");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/applications', (0, auth_1.requirePermission)('export:all'), async (req, res) => {
    try {
        const { filter, format = 'json' } = req.body;
        const result = await ExportService_1.ExportService.exportApplications(filter || {}, req.user.userId, req.user.userName, format);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
        res.send(result.data);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.get('/queue-stats', (0, auth_1.requirePermission)('export:all'), async (req, res) => {
    try {
        const format = req.query.format || 'json';
        const result = await ExportService_1.ExportService.exportQueueStats(req.user.userId, req.user.userName, format);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
        res.send(result.data);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.get('/dead-letters', (0, auth_1.requirePermission)('export:all'), async (req, res) => {
    try {
        const format = req.query.format || 'json';
        const status = req.query.status;
        const result = await ExportService_1.ExportService.exportDeadLetters(req.user.userId, req.user.userName, status, format);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
        res.send(result.data);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
exports.default = router;
