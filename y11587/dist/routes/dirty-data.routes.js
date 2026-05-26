"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dirty_data_service_1 = require("../services/dirty-data.service");
const router = (0, express_1.Router)();
const dirtyDataService = new dirty_data_service_1.DirtyDataService();
router.get("/", async (req, res) => {
    try {
        const { dirtyType, status, sourceTable } = req.query;
        const filters = {};
        if (dirtyType)
            filters.dirtyType = dirtyType;
        if (status)
            filters.status = status;
        if (sourceTable)
            filters.sourceTable = sourceTable;
        const records = await dirtyDataService.getDirtyRecords(filters);
        res.json({ success: true, data: records });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.get("/stats", async (req, res) => {
    try {
        const stats = await dirtyDataService.getDirtyStats();
        res.json({ success: true, data: stats });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.post("/:id/review", async (req, res) => {
    try {
        const { remark, status, correctedData } = req.body;
        const record = await dirtyDataService.reviewDirtyRecord(req.params.id, req.headers["x-operator"] || "system", remark, status || "PENDING_REVIEW", correctedData);
        res.json({ success: true, data: record });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.post("/:id/resolve", async (req, res) => {
    try {
        const { correctedData, resolution } = req.body;
        const record = await dirtyDataService.resolveDirtyRecord(req.params.id, req.headers["x-operator"] || "system", correctedData, resolution);
        res.json({ success: true, data: record });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.post("/validate/contract", async (req, res) => {
    try {
        const result = dirtyDataService.validateContractData(req.body);
        if (!result.isValid && result.issues.length > 0) {
            for (const issue of result.issues) {
                await dirtyDataService.recordDirtyData(issue.sourceTable, issue.sourceRecordId ?? null, JSON.parse(issue.originalData), issue.dirtyType, issue.fieldIssues ? JSON.parse(issue.fieldIssues) : undefined, issue.conflictDetails ? JSON.parse(issue.conflictDetails) : undefined);
            }
        }
        res.json({
            success: true,
            data: {
                isValid: result.isValid,
                issuesFound: result.issues.length,
                issues: result.issues.map((i) => ({
                    type: i.dirtyType,
                    fields: i.fieldIssues,
                    details: i.conflictDetails,
                })),
            },
        });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.post("/validate/payment-node", async (req, res) => {
    try {
        const result = dirtyDataService.validatePaymentNodeData(req.body);
        if (!result.isValid && result.issues.length > 0) {
            for (const issue of result.issues) {
                await dirtyDataService.recordDirtyData(issue.sourceTable, issue.sourceRecordId ?? null, JSON.parse(issue.originalData), issue.dirtyType, issue.fieldIssues ? JSON.parse(issue.fieldIssues) : undefined, issue.conflictDetails ? JSON.parse(issue.conflictDetails) : undefined);
            }
        }
        res.json({
            success: true,
            data: {
                isValid: result.isValid,
                issuesFound: result.issues.length,
                issues: result.issues.map((i) => ({
                    type: i.dirtyType,
                    fields: i.fieldIssues,
                    details: i.conflictDetails,
                })),
            },
        });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
exports.default = router;
