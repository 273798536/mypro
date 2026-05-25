"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const materialService_1 = require("../services/materialService");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const types_1 = require("../types");
const roleViewService_1 = require("../services/roleViewService");
const router = (0, express_1.Router)();
router.post('/', (0, roleMiddleware_1.roleAuth)([types_1.UserRole.OPERATOR, types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const request = req.body;
        const role = (0, roleMiddleware_1.getRoleFromRequest)(req);
        if (!request.materialId || !request.name || !request.platform || !request.originalName) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        request.createdBy = (0, roleMiddleware_1.getUserIdFromRequest)(req);
        const material = await materialService_1.materialService.createMaterial(request, role);
        res.status(201).json(material);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.get('/', (0, roleMiddleware_1.roleAuth)([types_1.UserRole.OPERATOR, types_1.UserRole.REVIEWER, types_1.UserRole.MANAGER, types_1.UserRole.AUDITOR, types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const status = req.query.status;
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const result = await materialService_1.materialService.listMaterials(status, page, pageSize);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/:materialId', (0, roleMiddleware_1.roleAuth)([types_1.UserRole.OPERATOR, types_1.UserRole.REVIEWER, types_1.UserRole.MANAGER, types_1.UserRole.AUDITOR, types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const { materialId } = req.params;
        const role = (0, roleMiddleware_1.getRoleFromRequest)(req);
        const detail = await roleViewService_1.roleViewService.getMaterialForRole(materialId, role);
        if (!detail) {
            return res.status(404).json({ error: 'Material not found' });
        }
        res.json(detail);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/:materialId/history', (0, roleMiddleware_1.roleAuth)([types_1.UserRole.OPERATOR, types_1.UserRole.REVIEWER, types_1.UserRole.MANAGER, types_1.UserRole.AUDITOR, types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const { materialId } = req.params;
        const history = await materialService_1.materialService.getStatusHistory(materialId);
        res.json(history);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/:materialId/status', (0, roleMiddleware_1.roleAuth)([types_1.UserRole.OPERATOR, types_1.UserRole.REVIEWER, types_1.UserRole.MANAGER, types_1.UserRole.AUDITOR, types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const { materialId } = req.params;
        const { toStatus, reason } = req.body;
        const role = (0, roleMiddleware_1.getRoleFromRequest)(req);
        const changedBy = (0, roleMiddleware_1.getUserIdFromRequest)(req);
        if (!toStatus || !reason) {
            return res.status(400).json({ error: 'toStatus and reason are required' });
        }
        const request = {
            materialId,
            toStatus,
            changedBy,
            reason
        };
        const material = await materialService_1.materialService.changeStatus(request, role);
        res.json(material);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.post('/:materialId/submit', (0, roleMiddleware_1.roleAuth)([types_1.UserRole.OPERATOR, types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const { materialId } = req.params;
        const submittedBy = (0, roleMiddleware_1.getUserIdFromRequest)(req);
        const material = await materialService_1.materialService.submitForReview(materialId, submittedBy);
        res.json(material);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.post('/:materialId/reject', (0, roleMiddleware_1.roleAuth)([types_1.UserRole.REVIEWER, types_1.UserRole.MANAGER, types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const { materialId } = req.params;
        const { reason } = req.body;
        const rejectedBy = (0, roleMiddleware_1.getUserIdFromRequest)(req);
        if (!reason) {
            return res.status(400).json({ error: 'reason is required' });
        }
        const material = await materialService_1.materialService.rejectMaterial(materialId, rejectedBy, reason);
        res.json(material);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.post('/:materialId/confirm', (0, roleMiddleware_1.roleAuth)([types_1.UserRole.REVIEWER, types_1.UserRole.MANAGER, types_1.UserRole.ADMIN]), async (req, res) => {
    try {
        const { materialId } = req.params;
        const confirmedBy = (0, roleMiddleware_1.getUserIdFromRequest)(req);
        const material = await materialService_1.materialService.secondaryConfirm(materialId, confirmedBy);
        res.json(material);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=materials.js.map