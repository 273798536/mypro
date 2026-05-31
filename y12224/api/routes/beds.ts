import { Router, type Request, type Response } from 'express';
import { getDb } from '../database.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT b.*,
           r.name as resident_name
    FROM beds b
    LEFT JOIN residents r ON b.resident_id = r.id
    ORDER BY b.floor, b.room_number, b.bed_number
  `).all();
  res.json({ success: true, data: rows });
});

router.put('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const { status, residentId, dailyRate } = req.body;

  try {
    const updates: string[] = [];
    const values: any[] = [];

    if (status !== undefined) { updates.push('status = ?'); values.push(status); }
    if (residentId !== undefined) { updates.push('resident_id = ?'); values.push(residentId); }
    if (dailyRate !== undefined) { updates.push('daily_rate = ?'); values.push(dailyRate); }

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: '无更新内容' });
      return;
    }

    values.push(req.params.id);
    db.prepare(`UPDATE beds SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const row = db.prepare(`
      SELECT b.*, r.name as resident_name
      FROM beds b
      LEFT JOIN residents r ON b.resident_id = r.id
      WHERE b.id = ?
    `).get(req.params.id);
    res.json({ success: true, data: row });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
