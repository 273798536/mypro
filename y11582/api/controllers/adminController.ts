
import { Request, Response } from 'express';
import { queueService } from '../services/queueService';

export const adminController = {
  resumeProcessing(_req: Request, res: Response): void {
    const count = queueService.resumeProcessing();
    res.json({ resumed: count, message: `Resumed processing ${count} tasks` });
  },

  startProcessing(_req: Request, res: Response): void {
    queueService.startProcessing();
    res.json({ message: 'Processing started' });
  },

  stopProcessing(_req: Request, res: Response): void {
    queueService.stopProcessing();
    res.json({ message: 'Processing stopped' });
  },
};
