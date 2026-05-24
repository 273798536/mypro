import { Router, Request, Response } from 'express';
import { summaryService } from '../services/summaryService';
import { requirePermission } from '../middleware/auth';

const router = Router();

router.get(
  '/role-view',
  requirePermission('view_list'),
  async (req: Request, res: Response) => {
    const user = req.user!;
    const summary = await summaryService.getRoleViewSummary(user);

    res.json({
      success: true,
      data: summary
    });
  }
);

router.get(
  '/change-reasons',
  requirePermission('view_change_reasons'),
  async (req: Request, res: Response) => {
    const reasons = await summaryService.getChangeReasons();

    res.json({
      success: true,
      data: reasons
    });
  }
);

router.get(
  '/sensitive-handling',
  requirePermission('view_sensitive_handling'),
  async (req: Request, res: Response) => {
    const handling = await summaryService.getSensitiveFieldHandling();

    res.json({
      success: true,
      data: handling
    });
  }
);

router.get(
  '/consistency-report',
  requirePermission('view_role_summary'),
  async (req: Request, res: Response) => {
    const report = await summaryService.getDataConsistencyReport();

    res.json({
      success: true,
      data: report
    });
  }
);

router.get(
  '/dirty-stats',
  requirePermission('view_list'),
  async (req: Request, res: Response) => {
    const stats = await summaryService.getDirtyRecordStats();

    res.json({
      success: true,
      data: stats
    });
  }
);

export default router;
