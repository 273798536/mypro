import { Router, Request, Response } from 'express';
import { getAllAuditTrails } from '../services/auditService';
import { getFailedRecords, getFailedRecordStats } from '../services/failedRecordService';
import { RoleType } from '../database/schema';

const router = Router();

router.get('/trails', async (req: Request, res: Response) => {
  try {
    const { startTime, endTime, operatorRole } = req.query;
    const trails = await getAllAuditTrails({
      startTime: startTime ? parseInt(startTime as string) : undefined,
      endTime: endTime ? parseInt(endTime as string) : undefined,
      operatorRole: operatorRole as RoleType
    });
    res.json(trails);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/failed-records', async (req: Request, res: Response) => {
  try {
    const { recordType, errorType, limit } = req.query;
    const records = await getFailedRecords({
      recordType: recordType as any,
      errorType: errorType as string,
      limit: limit ? parseInt(limit as string) : undefined
    });
    res.json(records);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/failed-records/stats', async (req: Request, res: Response) => {
  try {
    const stats = await getFailedRecordStats();
    res.json(stats);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
