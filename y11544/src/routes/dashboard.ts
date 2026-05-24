import { Router } from 'express';
import { roleViewService } from '../services/roleViewService';
import { roleAuth, getRoleFromRequest, AuthenticatedRequest } from '../middleware/roleMiddleware';
import { UserRole } from '../types';

const router = Router();

router.get('/',
  roleAuth([UserRole.OPERATOR, UserRole.REVIEWER, UserRole.MANAGER, UserRole.AUDITOR, UserRole.ADMIN]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const role = getRoleFromRequest(req);
      const dashboard = await roleViewService.getRoleDashboard(role);
      res.json(dashboard);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
