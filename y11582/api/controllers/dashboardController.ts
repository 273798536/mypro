
import { Request, Response } from 'express';
import { queueService } from '../services/queueService';

export const dashboardController = {
  getStats(_req: Request, res: Response): void {
    const stats = queueService.getStats();
    res.json({
      total: stats.total,
      pending: stats.pending,
      processing: stats.processing,
      waitingRetry: stats.waiting_retry,
      waitingManual: stats.waiting_manual,
      permanentFailed: stats.permanent_failed,
      success: stats.success,
      closed: stats.closed,
    });
  },

  getRetryCategories(_req: Request, res: Response): void {
    const categories = queueService.getRetryCategories();
    res.json(categories);
  },
};
