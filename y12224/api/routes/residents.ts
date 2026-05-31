import { Router, type Request, type Response } from 'express';
import { getDb } from '../database.js';

const router = Router();

function generateId(): string {
  return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT r.*, b.room_number, b.bed_number, b.room_type,
           b.room_number || '-' || b.bed_number as bed_label
    FROM residents r
    LEFT JOIN beds b ON r.bed_id = b.id
    ORDER BY r.created_at DESC
  `).all();
  res.json({ success: true, data: rows });
});

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare(`
    SELECT r.*, b.room_number, b.bed_number, b.room_type,
           b.room_number || '-' || b.bed_number as bed_label
    FROM residents r
    LEFT JOIN beds b ON r.bed_id = b.id
    WHERE r.id = ?
  `).get(req.params.id);
  if (!row) {
    res.status(404).json({ success: false, error: '档案不存在' });
    return;
  }
  res.json({ success: true, data: row });
});

router.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const { name, gender, birthDate, idCard, nursingLevel, bedId, admitDate, emergencyContact, emergencyPhone, depositAmount } = req.body;

  const id = generateId();
  const now = new Date().toISOString();

  const insertResident = db.transaction(() => {
    db.prepare(`
      INSERT INTO residents (id, name, gender, birth_date, id_card, nursing_level, bed_id, admit_date, emergency_contact, emergency_phone, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '在住', ?, ?)
    `).run(id, name, gender, birthDate, idCard, nursingLevel, bedId || null, admitDate, emergencyContact, emergencyPhone, now, now);

    if (bedId) {
      const bed = db.prepare('SELECT * FROM beds WHERE id = ?').get(bedId) as any;
      if (bed) {
        const feeRate = db.prepare('SELECT * FROM fee_rates WHERE room_type = ? AND nursing_level = ?').get(bed.room_type, nursingLevel) as any;
        const dailyRate = feeRate ? feeRate.daily_rate : bed.daily_rate;
        db.prepare('UPDATE beds SET status = ?, resident_id = ?, daily_rate = ? WHERE id = ?')
          .run('已住', id, dailyRate, bedId);
      }
    }

    if (depositAmount && depositAmount > 0) {
      const depositId = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      db.prepare(`
        INSERT INTO deposits (id, resident_id, total_amount, current_balance, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, '已收', ?, ?)
      `).run(depositId, id, depositAmount, depositAmount, now, now);

      const txId = 'dt' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      db.prepare(`
        INSERT INTO deposit_transactions (id, deposit_id, type, amount, reason, trigger_source, created_at)
        VALUES (?, ?, '收取', ?, '入住押金', ?, ?)
      `).run(txId, depositId, depositAmount, `入住档案 ${id}`, now);
    }
  });

  try {
    insertResident();
    const row = db.prepare(`
      SELECT r.*, b.room_number, b.bed_number, b.room_type,
             b.room_number || '-' || b.bed_number as bed_label
      FROM residents r
      LEFT JOIN beds b ON r.bed_id = b.id
      WHERE r.id = ?
    `).get(id);
    res.json({ success: true, data: row });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const { name, gender, birthDate, idCard, nursingLevel, emergencyContact, emergencyPhone, status } = req.body;
  const now = new Date().toISOString();

  try {
    db.prepare(`
      UPDATE residents SET name=COALESCE(?,name), gender=COALESCE(?,gender), birth_date=COALESCE(?,birth_date),
        id_card=COALESCE(?,id_card), nursing_level=COALESCE(?,nursing_level),
        emergency_contact=COALESCE(?,emergency_contact), emergency_phone=COALESCE(?,emergency_phone),
        status=COALESCE(?,status), updated_at=?
      WHERE id=?
    `).run(name || null, gender || null, birthDate || null, idCard || null, nursingLevel || null, emergencyContact || null, emergencyPhone || null, status || null, now, req.params.id);

    if (nursingLevel && status !== '退住') {
      const resident = db.prepare('SELECT * FROM residents WHERE id = ?').get(req.params.id) as any;
      if (resident && resident.bed_id) {
        const bed = db.prepare('SELECT * FROM beds WHERE id = ?').get(resident.bed_id) as any;
        if (bed) {
          const feeRate = db.prepare('SELECT * FROM fee_rates WHERE room_type = ? AND nursing_level = ?').get(bed.room_type, nursingLevel) as any;
          if (feeRate) {
            db.prepare('UPDATE beds SET daily_rate = ? WHERE id = ?').run(feeRate.daily_rate, resident.bed_id);
          }
        }
      }
    }

    const row = db.prepare(`
      SELECT r.*, b.room_number, b.bed_number, b.room_type,
             b.room_number || '-' || b.bed_number as bed_label
      FROM residents r
      LEFT JOIN beds b ON r.bed_id = b.id
      WHERE r.id = ?
    `).get(req.params.id);
    res.json({ success: true, data: row });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
