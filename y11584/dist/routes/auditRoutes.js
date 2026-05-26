"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auditService_1 = require("../services/auditService");
const failedRecordService_1 = require("../services/failedRecordService");
const router = (0, express_1.Router)();
router.get('/trails', async (req, res) => {
    try {
        const { startTime, endTime, operatorRole } = req.query;
        const trails = await (0, auditService_1.getAllAuditTrails)({
            startTime: startTime ? parseInt(startTime) : undefined,
            endTime: endTime ? parseInt(endTime) : undefined,
            operatorRole: operatorRole
        });
        res.json(trails);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.get('/failed-records', async (req, res) => {
    try {
        const { recordType, errorType, limit } = req.query;
        const records = await (0, failedRecordService_1.getFailedRecords)({
            recordType: recordType,
            errorType: errorType,
            limit: limit ? parseInt(limit) : undefined
        });
        res.json(records);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.get('/failed-records/stats', async (req, res) => {
    try {
        const stats = await (0, failedRecordService_1.getFailedRecordStats)();
        res.json(stats);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;
