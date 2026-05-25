"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const costService_1 = require("../services/costService");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const types_1 = require("../types");
const router = (0, express_1.Router)();
router.post('/', (0, roleMiddleware_1.roleAuth)([types_1.UserRole.OPERATOR, types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const request = {
            ...req.body,
            source: req.body.source || 'api'
        };
        const result = await costService_1.costService.importCost(request);
        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.error
            });
        }
        res.status(201).json({
            success: true,
            data: result.data
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/bulk', (0, roleMiddleware_1.roleAuth)([types_1.UserRole.OPERATOR, types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const requests = req.body.map((r) => ({
            ...r,
            source: r.source || 'bulk_import'
        }));
        const result = await costService_1.costService.bulkImportCosts(requests);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/material/:materialId', (0, roleMiddleware_1.roleAuth)([types_1.UserRole.OPERATOR, types_1.UserRole.REVIEWER, types_1.UserRole.MANAGER, types_1.UserRole.AUDITOR, types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const { materialId } = req.params;
        const includeInvalid = req.query.includeInvalid === 'true';
        const costs = await costService_1.costService.getCostsByMaterial(materialId, includeInvalid);
        res.json(costs);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/material/:materialId/summary', (0, roleMiddleware_1.roleAuth)([types_1.UserRole.OPERATOR, types_1.UserRole.REVIEWER, types_1.UserRole.MANAGER, types_1.UserRole.AUDITOR, types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const { materialId } = req.params;
        const summary = await costService_1.costService.getCostSummary(materialId);
        res.json(summary);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=costs.js.map