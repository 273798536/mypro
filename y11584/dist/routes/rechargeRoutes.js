"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const rechargeService_1 = require("../services/rechargeService");
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
        const result = await (0, rechargeService_1.createRechargeRecord)(data, operator);
        res.status(201).json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.post('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { action, operator, changeReason, reviewRemark } = req.body;
        if (!operator || !operator.id || !operator.role) {
            return res.status(400).json({ error: '缺少操作人信息' });
        }
        if (!action || !changeReason) {
            return res.status(400).json({ error: '缺少操作类型或变更原因' });
        }
        const result = await (0, rechargeService_1.updateRechargeStatus)(id, action, operator, changeReason, reviewRemark);
        res.json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.get('/summary', async (req, res) => {
    try {
        const { storeId, startTime, endTime } = req.query;
        const summary = await (0, rechargeService_1.getRechargeSummary)({
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
        const csv = await (0, exportService_1.exportRechargeToCSV)(role, {
            storeId: storeId,
            status: status,
            startTime: startTime ? parseInt(startTime) : undefined,
            endTime: endTime ? parseInt(endTime) : undefined
        });
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="recharge_records.csv"');
        res.send('\uFEFF' + csv);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.get('/order/:orderNo', async (req, res) => {
    try {
        const record = await (0, rechargeService_1.getRechargeByOrderNo)(req.params.orderNo);
        if (!record) {
            return res.status(404).json({ error: '记录不存在' });
        }
        res.json(record);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.get('/', async (req, res) => {
    try {
        const { storeId, memberId, status, startTime, endTime, limit, offset } = req.query;
        const records = await (0, rechargeService_1.getRechargeList)({
            storeId: storeId,
            memberId: memberId,
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
        const record = await (0, rechargeService_1.getRechargeById)(req.params.id);
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
        const trails = await (0, auditService_1.getAuditTrailsByRecord)(req.params.id, schema_1.RecordType.RECHARGE);
        res.json(trails);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;
