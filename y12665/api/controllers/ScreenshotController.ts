import type { Request, Response, NextFunction } from 'express';
import { screenshotService } from '../services/index.js';
import type { Screenshot } from '../../shared/types.js';

export class ScreenshotController {
  async mark(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reviewStatus, reviewNote } = req.body;

      const validStatuses: Screenshot['reviewStatus'][] = ['approved', 'pending', 'rejected'];
      if (!validStatuses.includes(reviewStatus)) {
        res.status(400).json({
          success: false,
          error: 'Invalid reviewStatus, must be one of: approved, pending, rejected',
        });
        return;
      }

      const updated = screenshotService.markReview(req.params.id, reviewStatus, reviewNote);
      if (!updated) {
        res.status(404).json({ success: false, error: 'Screenshot not found' });
        return;
      }

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  async getDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const screenshot = screenshotService.findById(req.params.id);
      if (!screenshot) {
        res.status(404).json({ success: false, error: 'Screenshot not found' });
        return;
      }
      res.json({ success: true, data: screenshot });
    } catch (err) {
      next(err);
    }
  }
}

export const screenshotController = new ScreenshotController();
