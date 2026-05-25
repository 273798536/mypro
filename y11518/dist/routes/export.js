"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ExportService_1 = require("../services/ExportService");
const router = (0, express_1.Router)();
const exportService = new ExportService_1.ExportService();
router.post("/workorders", async (req, res) => {
    try {
        const { workOrderNos } = req.body;
        const operator = req.headers["x-operator"] || "system";
        const filepath = await exportService.exportWorkOrders(workOrderNos, operator);
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
router.post("/inventory", async (req, res) => {
    try {
        const { startDate, endDate } = req.body;
        const operator = req.headers["x-operator"] || "system";
        const filepath = await exportService.exportInventory(startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined, operator);
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
router.post("/reconciliation", async (req, res) => {
    try {
        const { workOrderNo } = req.body;
        const operator = req.headers["x-operator"] || "system";
        const filepath = await exportService.exportReconciliation(workOrderNo, operator);
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
router.post("/dirty-records", async (req, res) => {
    try {
        const operator = req.headers["x-operator"] || "system";
        const filepath = await exportService.exportDirtyRecords(operator);
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
