"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const DirtyRecordService_1 = require("../services/DirtyRecordService");
const ExportService_1 = require("../services/ExportService");
const router = (0, express_1.Router)();
const dirtyRecordService = new DirtyRecordService_1.DirtyRecordService();
const exportService = new ExportService_1.ExportService();
router.get("/", async (req, res) => {
    try {
        const { status, dirtyType, recordType } = req.query;
        const data = await dirtyRecordService.getDirtyRecords(status, dirtyType, recordType);
        res.json({ success: true, data });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.get("/stats", async (req, res) => {
    try {
        const stats = await dirtyRecordService.getDirtyRecordStats();
        res.json({ success: true, data: stats });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.post("/:id/resolve", async (req, res) => {
    try {
        const { resolvedBy, resolutionNote, correctedData } = req.body;
        const result = await dirtyRecordService.resolveDirtyRecord(req.params.id, resolvedBy || req.headers["x-operator"] || "system", resolutionNote, correctedData);
        if (!result) {
            return res
                .status(404)
                .json({ success: false, message: "异常记录不存在" });
        }
        res.json({ success: true, data: result });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.post("/replay", async (req, res) => {
    try {
        const { dirtyType, recordType } = req.body;
        const pendingRecords = await dirtyRecordService.getDirtyRecords("pending", dirtyType, recordType);
        const results = [];
        for (const record of pendingRecords) {
            results.push({
                id: record.id,
                recordType: record.recordType,
                dirtyType: record.dirtyType,
                description: record.description,
                canAutoResolve: record.dirtyType === "amount_conflict" || record.dirtyType === "missing_field",
            });
        }
        res.json({
            success: true,
            data: {
                total: pendingRecords.length,
                records: results,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.post("/export", async (req, res) => {
    try {
        const filepath = await exportService.exportDirtyRecords();
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
