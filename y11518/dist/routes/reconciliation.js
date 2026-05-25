"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ReconciliationService_1 = require("../services/ReconciliationService");
const ExportService_1 = require("../services/ExportService");
const router = (0, express_1.Router)();
const reconciliationService = new ReconciliationService_1.ReconciliationService();
const exportService = new ExportService_1.ExportService();
router.post("/workorder/:workOrderNo", async (req, res) => {
    try {
        const result = await reconciliationService.reconcileWorkOrder(req.params.workOrderNo, req.headers["x-operator"] || "system");
        res.json({ success: true, data: result });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.get("/", async (req, res) => {
    try {
        const { workOrderNo } = req.query;
        const data = await reconciliationService.getReconciliationHistory(workOrderNo);
        res.json({ success: true, data });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.get("/:id", async (req, res) => {
    try {
        const data = await reconciliationService.getReconciliationDetail(req.params.id);
        if (!data) {
            return res
                .status(404)
                .json({ success: false, message: "对账记录不存在" });
        }
        res.json({ success: true, data });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.get("/stats/summary", async (req, res) => {
    try {
        const stats = await reconciliationService.getReconciliationStats();
        res.json({ success: true, data: stats });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.post("/export", async (req, res) => {
    try {
        const { workOrderNo } = req.body;
        const filepath = await exportService.exportReconciliation(workOrderNo);
        res.json({
            success: true,
            data: {
                filepath,
                filename: filepath.split("/").pop(),
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.default = router;
