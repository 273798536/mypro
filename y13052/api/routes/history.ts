import { Router, type Request, type Response } from 'express';
import type { HistoryQuery, ApiResponse } from '../../shared/types.js';
import { listHistory } from '../services/historyService.js';

const router = Router();

function ok<T>(res: Response, data: T, message = 'ok') {
  const resp: ApiResponse<T> = {
    code: 0,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
  res.json(resp);
}

router.get('/', (req: Request, res: Response) => {
  const query: HistoryQuery = {
    caseId: (req.query.caseId as string) || undefined,
    operator: (req.query.operator as string) || undefined,
    action: (req.query.action as HistoryQuery['action']) || undefined,
  };
  ok(res, listHistory(query));
});

export default router;
