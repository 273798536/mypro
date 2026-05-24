import { Router } from 'express';
import { failedRecordService } from '../services/failedRecordService';
import { roleAuth } from '../middleware/roleMiddleware';
import { UserRole } from '../types';

const router = Router();

router.get('/',
  roleAuth([UserRole.MANAGER, UserRole.AUDITOR, UserRole.ADMIN]),
  async (req, res) => {
    try {
      const recordType = req.query.type as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 50;

      const result = await failedRecordService.getFailedRecords(recordType, page, pageSize);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get('/stats',
  roleAuth([UserRole.MANAGER, UserRole.AUDITOR, UserRole.ADMIN]),
  async (req, res) => {
    try {
      const stats = await failedRecordService.getFailedRecordStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
