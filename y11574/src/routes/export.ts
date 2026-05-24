import { Router, Request, Response } from 'express';
import { exportService } from '../services/exportService';
import { requirePermission } from '../middleware/auth';
import { WorkflowStatus } from '../types';

const router = Router();

router.post(
  '/csv',
  requirePermission('export_masked'),
  async (req: Request, res: Response) => {
    const user = req.user!;
    const {
      status,
      startDate,
      endDate,
      department,
      isMasked = true
    } = req.body;

    try {
      const { csv, exportLogId } = await exportService.exportToCSV(
        {
          status: status as WorkflowStatus | undefined,
          startDate,
          endDate,
          department
        },
        user,
        isMasked
      );

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="liability_records_${Date.now()}.csv"`);
      res.setHeader('X-Export-Log-Id', exportLogId);
      
      res.send('\uFEFF' + csv);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

router.get(
  '/history',
  requirePermission('view_history'),
  async (req: Request, res: Response) => {
    const user = req.user!;
    const { limit = '20' } = req.query;

    const history = await exportService.getExportHistory(
      user,
      parseInt(limit as string, 10)
    );

    res.json({
      success: true,
      data: history
    });
  }
);

router.get(
  '/verify/:exportId',
  requirePermission('view_role_summary'),
  async (req: Request, res: Response) => {
    try {
      const result = await exportService.verifyExportConsistency(req.params.exportId);
      
      res.json({
        success: true,
        data: result
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
);

export default router;
