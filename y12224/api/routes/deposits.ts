import { Router, type Request, type Response } from 'express';
import { getDb } from '../database.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT d.*, r.name as resident_name,
           b.room_number || '-' || b.bed_number as bed_label
    FROM deposits d
    JOIN residents r ON d.resident_id = r.id
    LEFT JOIN beds b ON r.bed_id = b.id
    ORDER BY d.updated_at DESC
  `).all();
  res.json({ success: true, data: rows });
});

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const deposit = db.prepare(`
    SELECT d.*, r.name as resident_name,
           b.room_number || '-' || b.bed_number as bed_label
    FROM deposits d
    JOIN residents r ON d.resident_id = r.id
    LEFT JOIN beds b ON r.bed_id = b.id
    WHERE d.id = ?
  `).get(req.params.id) as any;

  if (!deposit) {
    res.status(404).json({ success: false, error: '押金记录不存在' });
    return;
  }

  const transactions = db.prepare(
    'SELECT * FROM deposit_transactions WHERE deposit_id = ? ORDER BY created_at DESC'
  ).all(deposit.id);

  deposit.transactions = transactions;
  res.json({ success: true, data: deposit });
});

router.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const { residentId, amount } = req.body;
  const now = new Date().toISOString();
  const id = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  try {
    db.prepare(`
      INSERT INTO deposits (id, resident_id, total_amount, current_balance, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, '已收', ?, ?)
    `).run(id, residentId, amount, amount, now, now);

    const txId = 'dt' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    db.prepare(`
      INSERT INTO deposit_transactions (id, deposit_id, type, amount, reason, trigger_source, created_at)
      VALUES (?, ?, '收取', ?, '入住押金', ?, ?)
    `).run(txId, id, amount, `入住档案 ${residentId}`, now);

    const deposit = db.prepare(`
      SELECT d.*, r.name as resident_name,
             b.room_number || '-' || b.bed_number as bed_label
      FROM deposits d
      JOIN residents r ON d.resident_id = r.id
      LEFT JOIN beds b ON r.bed_id = b.id
      WHERE d.id = ?
    `).get(id);
    res.json({ success: true, data: deposit });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/:id/transactions', (req: Request, res: Response) => {
  const db = getDb();
  const { type, amount, reason, triggerSource, triggerEventId } = req.body;
  const depositId = req.params.id;
  const now = new Date().toISOString();

  const deposit = db.prepare('SELECT * FROM deposits WHERE id = ?').get(depositId) as any;
  if (!deposit) {
    res.status(404).json({ success: false, error: '押金记录不存在' });
    return;
  }

  const txId = 'dt' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const insertTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO deposit_transactions (id, deposit_id, type, amount, reason, trigger_source, trigger_event_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(txId, depositId, type, amount, reason, triggerSource, triggerEventId || null, now);

    let newBalance = deposit.current_balance;
    let newTotal = deposit.total_amount;
    let newStatus = deposit.status;

    if (type === '收取' || type === '补差收取') {
      newBalance += amount;
      newTotal += amount;
      newStatus = '已收';
    } else if (type === '退还' || type === '补差退还' || type === '费用抵扣') {
      newBalance -= amount;
      if (newBalance <= 0) {
        newBalance = 0;
        newStatus = '已退';
      } else {
        newStatus = '部分退';
      }
    }

    db.prepare(`
      UPDATE deposits SET current_balance = ?, total_amount = ?, status = ?, updated_at = ? WHERE id = ?
    `).run(newBalance, newTotal, newStatus, now, depositId);
  });

  try {
    insertTx();
    const updated = db.prepare(`
      SELECT d.*, r.name as resident_name,
             b.room_number || '-' || b.bed_number as bed_label
      FROM deposits d
      JOIN residents r ON d.resident_id = r.id
      LEFT JOIN beds b ON r.bed_id = b.id
      WHERE d.id = ?
    `).get(depositId);
    const transactions = db.prepare(
      'SELECT * FROM deposit_transactions WHERE deposit_id = ? ORDER BY created_at DESC'
    ).all(depositId);
    (updated as any).transactions = transactions;
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
