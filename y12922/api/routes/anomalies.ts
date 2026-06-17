import { Router, type Request, type Response } from 'express';
import { getAnomaly, reviewAnomaly } from '../services/anomalyService.js';
import type { OpinionAction, AnomalyStatus } from '../../shared/types.js';

const router = Router();

function ok<T>(res: Response, data: T): void {
  res.json({ success: true, data });
}

function fail(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : '请求失败';
  res.status(400).json({ success: false, error: message });
}

router.get('/:id', (req: Request, res: Response) => {
  try {
    ok(res, getAnomaly(req.params.id));
  } catch (e) { fail(res, e); }
});

router.patch('/:id', (req: Request, res: Response) => {
  try {
    const { action, text, reviewer, status } = req.body as {
      action?: OpinionAction;
      text?: string;
      reviewer?: string;
      status?: AnomalyStatus;
    };
    ok(res, reviewAnomaly(req.params.id, { action, text, reviewer, status }));
  } catch (e) { fail(res, e); }
});

export default router;
