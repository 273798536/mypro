import { Router, type Request, type Response } from 'express';
import { getDb } from '../database.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM fee_rates ORDER BY room_type, nursing_level').all();
  res.json({ success: true, data: rows });
});

export default router;
