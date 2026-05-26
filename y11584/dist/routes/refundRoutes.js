"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const refundService_1 = require("../services/refundService");
const auditService_1 = require("../services/auditService");
const exportService_1 = require("../services/exportService");
const schema_1 = require("../database/schema");
const router = (0, express_1.Router)();
router.post('/', async (req, res) => {
    try {
        const { operator, ...data } = req.body;
        if (!operator || !operator.id || !operator.role) {
            return res.status(400).json({ error: '缺少操作人信息' });
        }
        const result = await (0, refundService_1.createRefundApplication)(data, operator);
        res.status(201).json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.post('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { action, operator, changeReason, reviewRemark, inventoryRollback } = req.body;
        if (!operator || !operator.id || !operator.role) {
            return res.status(400).json({ error: '缺少操作人信息' });
        }
        if (!action || !changeReason) {
            return res.status(400).json({ error: '缺少操作类型或变更原因' });
        }
        const result = await (0, refundService_1.updateRefundStatus)(id, action, operator, changeReason, reviewRemark, inventoryRollback);
        res.json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.get('/summary', async (req, res) => {
    try {
        const { storeId, startTime, endTime } = req.query;
        const summary = await (0, refundService_1.getRefundSummary)({
            storeId: storeId,
            startTime: startTime ? parseInt(startTime) : undefined,
            endTime: endTime ? parseInt(endTime) : undefined
        });
        res.json(summary);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.get('/export/csv', async (req, res) => {
    try {
        const { role, storeId, status, startTime, endTime } = req.query;
        if (!role) {
            return res.status(400).json({ error: '缺少角色信息' });
        }
        const csv = await (0, exportService_1.exportRefundToCSV)(role, {
            storeId: storeId,
            status: status,
            startTime: startTime ? parseInt(startTime) : undefined,
            endTime: endTime ? parseInt(endTime) : undefined
        });
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="refund_applications.csv"');
        res.send('\uFEFF' + csv);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.get('/', async (req, res) => {
    try {
        const { storeId, rechargeOrderNo, status, startTime, endTime, limit, offset } = req.query;
        const records = await (0, refundService_1.getRefundList)({
            storeId: storeId,
            rechargeOrderNo: rechargeOrderNo,
            status: status,
            startTime: startTime ? parseInt(startTime) : undefined,
            endTime: endTime ? parseInt(endTime) : undefined,
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined
        });
        res.json(records);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const record = await (0, refundService_1.getRefundById)(req.params.id);
        if (!record) {
            return res.status(404).json({ error: '记录不存在' });
        }
        res.json(record);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.get('/:id/audit-trails', async (req, res) => {
    try {
        const trails = await (0, auditService_1.getAuditTrailsByRecord)(req.params.id, schema_1.RecordType.REFUND);
        res.json(trails);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;
