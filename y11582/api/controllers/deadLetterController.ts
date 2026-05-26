
import { type Request, type Response } from 'express';
import { queueService } from '../services/queueService.js';

function getOperator(req: Request): string {
  return req.user?.username || 'system';
}

export const deadLetterController = {
  getDeadLetters(_req: Request, res: Response): void {
    const deadLetters = queueService.getDeadLetters();
    res.json(deadLetters);
  },

  reviveDeadLetter(req: Request, res: Response): void {
    try {
      const task = queueService.reviveDeadLetter(
        req.params.id,
        getOperator(req)
      );
      res.json(task);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },
};
