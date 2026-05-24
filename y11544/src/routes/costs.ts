import { Router } from 'express';
import { costService } from '../services/costService';
import { roleAuth, getUserIdFromRequest, AuthenticatedRequest } from '../middleware/roleMiddleware';
import { UserRole, CostImportRequest } from '../types';

const router = Router();

router.post('/',
  roleAuth([UserRole.OPERATOR, UserRole.ADMIN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const request: CostImportRequest = {
        ...req.body,
        source: req.body.source || 'api'
      };

      const result = await costService.importCost(request);

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
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.post('/bulk',
  roleAuth([UserRole.OPERATOR, UserRole.ADMIN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const requests: CostImportRequest[] = req.body.map((r: any) => ({
        ...r,
        source: r.source || 'bulk_import'
      }));

      const result = await costService.bulkImportCosts(requests);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get('/material/:materialId',
  roleAuth([UserRole.OPERATOR, UserRole.REVIEWER, UserRole.MANAGER, UserRole.AUDITOR, UserRole.ADMIN]),
  async (req, res) => {
    try {
      const { materialId } = req.params;
      const includeInvalid = req.query.includeInvalid === 'true';
      const costs = await costService.getCostsByMaterial(materialId, includeInvalid);
      res.json(costs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get('/material/:materialId/summary',
  roleAuth([UserRole.OPERATOR, UserRole.REVIEWER, UserRole.MANAGER, UserRole.AUDITOR, UserRole.ADMIN]),
  async (req, res) => {
    try {
      const { materialId } = req.params;
      const summary = await costService.getCostSummary(materialId);
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
