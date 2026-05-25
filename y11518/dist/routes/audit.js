"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuditService_1 = require("../services/AuditService");
const router = (0, express_1.Router)();
const auditService = new AuditService_1.AuditService();
router.get("/snapshots", async (req, res) => {
    try {
        const { targetType, targetId, operationId } = req.query;
        let snapshots;
        if (operationId) {
            snapshots = await auditService.getSnapshotsByOperation(operationId);
        }
        else if (targetType && targetId) {
            snapshots = await auditService.getSnapshotsByTarget(targetType, targetId);
        }
        else {
            return res.status(400).json({
                success: false,
                message: "需要提供 operationId 或 targetType + targetId",
            });
        }
        res.json({ success: true, data: snapshots });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.get("/history/:targetType/:targetId", async (req, res) => {
    try {
        const history = await auditService.getSnapshotHistory(req.params.targetType, req.params.targetId);
        res.json({ success: true, data: history });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.post("/diff", async (req, res) => {
    try {
        const { obj1, obj2 } = req.body;
        const result = auditService.compareObjects(obj1, obj2);
        res.json({ success: true, data: result });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.default = router;
