import { Router } from 'express';
import { exportService } from '../services/exportService';
import { roleAuth, getRoleFromRequest, AuthenticatedRequest } from '../middleware/roleMiddleware';
import { UserRole, MaterialStatus } from '../types';

const router = Router();

router.get('/csv',
  roleAuth([UserRole.AUDITOR, UserRole.ADMIN, UserRole.MANAGER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const status = req.query.status as MaterialStatus | undefined;
      const role = getRoleFromRequest(req);

      const csv = await exportService.exportToCSV(status, role);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="materials_${Date.now()}.csv"`);
      res.send('\uFEFF' + csv);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get('/material/:materialId/csv',
  roleAuth([UserRole.AUDITOR, UserRole.ADMIN, UserRole.MANAGER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { materialId } = req.params;
      const role = getRoleFromRequest(req);

      const csv = await exportService.exportMaterialDetail(materialId, role);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="material_${materialId}_detail_${Date.now()}.csv"`);
      res.send('\uFEFF' + csv);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }
);

export default router;
