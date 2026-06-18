import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/index.js';
import type { StatusLog } from '../../shared/types.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const { roundId } = req.query;
  if (!roundId) {
    res.status(400).json({ success: false, error: '缺少 roundId' });
    return;
  }
  const rows = db
    .prepare(
      `SELECT id, round_id as roundId, entity_type as entityType, entity_id as entityId,
              from_status as fromStatus, to_status as toStatus, operator, remark, timestamp
       FROM status_log WHERE round_id = ? ORDER BY timestamp DESC`,
    )
    .all(roundId) as StatusLog[];
  res.json({ success: true, data: rows });
});

export default router;
