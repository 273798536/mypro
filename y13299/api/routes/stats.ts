import { Router, type Request, type Response } from 'express';
import { db } from '../db.js';
import type { StatsData } from '../../shared/types.js';

const router = Router();

router.get('/', (req: Request, res: Response): void => {
  const rows = db
    .prepare('SELECT status, COUNT(*) as cnt FROM seat_record GROUP BY status')
    .all() as { status: string; cnt: number }[];

  const stats: StatsData = {
    pending: 0,
    approved: 0,
    exception: 0,
    needEvidence: 0,
    suspectedDuplicate: 0,
    total: 0,
  };

  for (const row of rows) {
    if (row.status === 'pending') stats.pending = row.cnt;
    else if (row.status === 'approved') stats.approved = row.cnt;
    else if (row.status === 'exception') stats.exception = row.cnt;
    else if (row.status === 'need_evidence') stats.needEvidence = row.cnt;
    else if (row.status === 'suspected_duplicate') stats.suspectedDuplicate = row.cnt;
    stats.total += row.cnt;
  }

  res.status(200).json({
    success: true,
    data: stats,
  });
});

export default router;
