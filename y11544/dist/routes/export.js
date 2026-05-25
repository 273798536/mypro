"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const exportService_1 = require("../services/exportService");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const types_1 = require("../types");
const router = (0, express_1.Router)();
router.get('/csv', (0, roleMiddleware_1.roleAuth)([types_1.UserRole.AUDITOR, types_1.UserRole.ADMIN, types_1.UserRole.MANAGER]), async (req, res) => {
    try {
        const status = req.query.status;
        const role = (0, roleMiddleware_1.getRoleFromRequest)(req);
        const csv = await exportService_1.exportService.exportToCSV(status, role);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="materials_${Date.now()}.csv"`);
        res.send('\uFEFF' + csv);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/material/:materialId/csv', (0, roleMiddleware_1.roleAuth)([types_1.UserRole.AUDITOR, types_1.UserRole.ADMIN, types_1.UserRole.MANAGER]), async (req, res) => {
    try {
        const { materialId } = req.params;
        const role = (0, roleMiddleware_1.getRoleFromRequest)(req);
        const csv = await exportService_1.exportService.exportMaterialDetail(materialId, role);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="material_${materialId}_detail_${Date.now()}.csv"`);
        res.send('\uFEFF' + csv);
    }
    catch (error) {
        res.status(404).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=export.js.map