import { Router, type Request, type Response } from 'express';
import { getDb } from '../database.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT s.*, r.name as resident_name
    FROM settlements s
    JOIN residents r ON s.resident_id = r.id
    ORDER BY s.generated_at DESC
  `).all();

  const result = rows.map((row: any) => ({
    ...row,
    depositSnapshot: JSON.parse(row.deposit_snapshot_json || '{}'),
    feeCalculation: JSON.parse(row.fee_calculation_json || '{}'),
  }));

  res.json({ success: true, data: result });
});

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare(`
    SELECT s.*, r.name as resident_name
    FROM settlements s
    JOIN residents r ON s.resident_id = r.id
    WHERE s.id = ?
  `).get(req.params.id) as any;

  if (!row) {
    res.status(404).json({ success: false, error: '结算说明不存在' });
    return;
  }

  row.depositSnapshot = JSON.parse(row.deposit_snapshot_json || '{}');
  row.feeCalculation = JSON.parse(row.fee_calculation_json || '{}');
  res.json({ success: true, data: row });
});

router.post('/generate/:eventId', (req: Request, res: Response) => {
  const db = getDb();
  const eventId = req.params.eventId;
  const now = new Date().toISOString();

  const event = db.prepare(`
    SELECT e.*, r.name as resident_name
    FROM events e
    JOIN residents r ON e.resident_id = r.id
    WHERE e.id = ?
  `).get(eventId) as any;

  if (!event) {
    res.status(404).json({ success: false, error: '事件不存在' });
    return;
  }

  const existing = db.prepare('SELECT * FROM settlements WHERE event_id = ?').get(eventId) as any;
  if (existing) {
    const existingRow = db.prepare(`
      SELECT s.*, r.name as resident_name
      FROM settlements s
      JOIN residents r ON s.resident_id = r.id
      WHERE s.id = ?
    `).get(existing.id) as any;
    existingRow.depositSnapshot = JSON.parse(existingRow.deposit_snapshot_json || '{}');
    existingRow.feeCalculation = JSON.parse(existingRow.fee_calculation_json || '{}');
    res.json({ success: true, data: existingRow });
    return;
  }

  const deposit = db.prepare(`
    SELECT d.*, r.name as resident_name,
           b.room_number || '-' || b.bed_number as bed_label
    FROM deposits d
    JOIN residents r ON d.resident_id = r.id
    LEFT JOIN beds b ON r.bed_id = b.id
    WHERE d.resident_id = ?
  `).get(event.resident_id) as any;

  let depositSnapshot = {};
  if (deposit) {
    const transactions = db.prepare(
      'SELECT * FROM deposit_transactions WHERE deposit_id = ? ORDER BY created_at DESC'
    ).all(deposit.id);
    depositSnapshot = {
      id: deposit.id,
      residentId: deposit.resident_id,
      residentName: deposit.resident_name,
      bedLabel: deposit.bed_label,
      totalAmount: deposit.total_amount,
      currentBalance: deposit.current_balance,
      status: deposit.status,
      transactions,
      createdAt: deposit.created_at,
      updatedAt: deposit.updated_at,
    };
  }

  const feeCalculation = event.fee_calculation_json ? JSON.parse(event.fee_calculation_json) : { items: [], totalDue: 0, totalRefund: 0, netAmount: 0 };

  const id = 'stl' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  try {
    db.prepare(`
      INSERT INTO settlements (id, event_id, resident_id, type, deposit_snapshot_json, fee_calculation_json, generated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, eventId, event.resident_id, event.type, JSON.stringify(depositSnapshot), JSON.stringify(feeCalculation), now);

    const row = db.prepare(`
      SELECT s.*, r.name as resident_name
      FROM settlements s
      JOIN residents r ON s.resident_id = r.id
      WHERE s.id = ?
    `).get(id) as any;
    row.depositSnapshot = JSON.parse(row.deposit_snapshot_json || '{}');
    row.feeCalculation = JSON.parse(row.fee_calculation_json || '{}');
    res.json({ success: true, data: row });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/:id/export', (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare(`
    SELECT s.*, r.name as resident_name, r.gender, r.id_card, r.nursing_level, r.admit_date
    FROM settlements s
    JOIN residents r ON s.resident_id = r.id
    WHERE s.id = ?
  `).get(req.params.id) as any;

  if (!row) {
    res.status(404).json({ success: false, error: '结算说明不存在' });
    return;
  }

  const depositSnapshot = JSON.parse(row.deposit_snapshot_json || '{}');
  const feeCalculation = JSON.parse(row.fee_calculation_json || '{}');
  const eventDetails = {};

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(row.event_id) as any;
  if (event) {
    Object.assign(eventDetails, JSON.parse(event.details_json || '{}'));
  }

  const exportData = {
    title: '养老机构结算说明',
    generatedAt: row.generated_at,
    resident: {
      name: row.resident_name,
      gender: row.gender,
      idCard: row.id_card,
      nursingLevel: row.nursing_level,
      admitDate: row.admit_date,
    },
    eventType: row.type,
    eventDetails,
    depositLedger: depositSnapshot,
    feeCalculation,
    summary: {
      totalDeposit: depositSnapshot.totalAmount || 0,
      currentBalance: depositSnapshot.currentBalance || 0,
      totalDue: feeCalculation.totalDue || 0,
      totalRefund: feeCalculation.totalRefund || 0,
      netAmount: feeCalculation.netAmount || 0,
    },
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="settlement-${row.id}.json"`);
  res.json(exportData);
});

export default router;
