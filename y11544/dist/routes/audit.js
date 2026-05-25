"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auditService_1 = require("../services/auditService");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const types_1 = require("../types");
const router = (0, express_1.Router)();
router.post('/audit', (0, roleMiddleware_1.roleAuth)([types_1.UserRole.REVIEWER, types_1.UserRole.MANAGER, types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const { materialId, auditResult, auditComment } = req.body;
        const auditedBy = (0, roleMiddleware_1.getUserIdFromRequest)(req);
        if (!materialId || !auditResult) {
            return res.status(400).json({ error: 'materialId and auditResult are required' });
        }
        const request = {
            materialId,
            auditResult,
            auditComment: auditComment || '',
            auditedBy
        };
        const record = await auditService_1.auditService.addAuditRecord(request);
        res.status(201).json(record);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/audit/material/:materialId', (0, roleMiddleware_1.roleAuth)([types_1.UserRole.OPERATOR, types_1.UserRole.REVIEWER, types_1.UserRole.MANAGER, types_1.UserRole.AUDITOR, types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const { materialId } = req.params;
        const records = await auditService_1.auditService.getAuditRecords(materialId);
        res.json(records);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/comments', (0, roleMiddleware_1.roleAuth)([types_1.UserRole.MANAGER, types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const { materialId, comment, evidence } = req.body;
        const commentedBy = (0, roleMiddleware_1.getUserIdFromRequest)(req);
        if (!materialId || !comment) {
            return res.status(400).json({ error: 'materialId and comment are required' });
        }
        const request = {
            materialId,
            comment,
            evidence,
            commentedBy
        };
        const record = await auditService_1.auditService.addManagerComment(request);
        res.status(201).json(record);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/comments/material/:materialId', (0, roleMiddleware_1.roleAuth)([types_1.UserRole.OPERATOR, types_1.UserRole.REVIEWER, types_1.UserRole.MANAGER, types_1.UserRole.AUDITOR, types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const { materialId } = req.params;
        const comments = await auditService_1.auditService.getManagerComments(materialId);
        res.json(comments);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=audit.js.map