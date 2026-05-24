
import { Request, Response } from 'express';
import { queueService } from '../services/queueService';

export const deadLetterController = {
  getDeadLetters(_req: Request, res: Response): void {
    const deadLetters = queueService.getDeadLetters();
    res.json(deadLetters);
  },

  reviveDeadLetter(req: Request, res: Response): void {
    try {
      const task = queueService.reviveDeadLetter(
        req.params.id,
        req.headers['x-operator'] as string || 'api_user'
      );
      res.json(task);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },
};
