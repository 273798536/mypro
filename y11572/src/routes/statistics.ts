import { Router, Request, Response, NextFunction } from 'express';
import {
  getDashboardStatistics,
  getBatchStatistics,
  getDeadLetterStatistics,
} from '../services/statisticsService';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.get('/dashboard', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await getDashboardStatistics();

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/batch/:batchId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { batchId } = req.params;
    const stats = await getBatchStatistics(batchId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/dead-letters', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await getDeadLetterStatistics();

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
