import { Router, Request, Response } from 'express';
import { ExportService } from '../services/ExportService';
import { requirePermission } from '../middleware/auth';
import { DeadLetterStatus } from '../entities/DeadLetter';

const router = Router();

router.post(
  '/applications',
  requirePermission('export:all'),
  async (req: Request, res: Response) => {
    try {
      const { filter, format = 'json' } = req.body;
      
      const result = await ExportService.exportApplications(
        filter || {},
        req.user!.userId,
        req.user!.userName,
        format as 'json' | 'csv'
      );

      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
      res.send(result.data);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

router.get(
  '/queue-stats',
  requirePermission('export:all'),
  async (req: Request, res: Response) => {
    try {
      const format = (req.query.format as string) || 'json';
      
      const result = await ExportService.exportQueueStats(
        req.user!.userId,
        req.user!.userName,
        format as 'json' | 'csv'
      );

      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
      res.send(result.data);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

router.get(
  '/dead-letters',
  requirePermission('export:all'),
  async (req: Request, res: Response) => {
    try {
      const format = (req.query.format as string) || 'json';
      const status = req.query.status as DeadLetterStatus;
      
      const result = await ExportService.exportDeadLetters(
        req.user!.userId,
        req.user!.userName,
        status,
        format as 'json' | 'csv'
      );

      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
      res.send(result.data);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

export default router;
