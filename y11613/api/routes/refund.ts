import { Router } from 'express';
import { getDatabase } from '../database/init.js';
import { generateId } from '../utils/index.js';
import type { MemberCardRow, RefundRequestRow, RefundWithCard } from '../types/index.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDatabase();
  try {
    const { status } = req.query;
    let sql = `
      SELECT r.*, c.card_no, c.user_name, c.phone
      FROM refund_requests r
      LEFT JOIN member_cards c ON r.card_id = c.id
      WHERE 1=1
    `;
    const params: string[] = [];

    if (status) {
      sql += ' AND r.status = ?';
      params.push(status as string);
    }
    sql += ' ORDER BY r.created_at DESC';

    const requests = db.prepare(sql).all(...params) as RefundWithCard[];
    res.json(requests);
  } finally {
    db.close();
  }
});

router.post('/', (req, res) => {
  const db = getDatabase();
  try {
    const { cardId, applicant, reason } = req.body;

    const card = db.prepare('SELECT * FROM member_cards WHERE id = ?').get(cardId) as MemberCardRow | undefined;
    if (!card) {
      return res.status(404).json({ error: '会员卡不存在' });
    }
    if (card.status === 'refunded') {
      return res.status(400).json({ error: '该卡已退卡' });
    }

    const existingRequest = db.prepare(`
      SELECT * FROM refund_requests 
      WHERE card_id = ? AND status = 'pending'
    `).get(cardId) as RefundRequestRow | undefined;
    if (existingRequest) {
      return res.status(400).json({ error: '已有待审核的退卡申请' });
    }

    const refundAmount = card.principal_balance;

    const requestId = generateId('refund');
    db.prepare(`
      INSERT INTO refund_requests (id, card_id, principal_balance, bonus_balance, refund_amount, status, applicant)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `).run(requestId, cardId, card.principal_balance, card.bonus_balance, refundAmount, applicant);

    db.prepare(`
      INSERT INTO audit_logs (id, action, module, operator, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(generateId('audit'), 'create_refund', 'refund', applicant, JSON.stringify({
      cardId,
      refundAmount,
      reason
    }));

    const request = db.prepare('SELECT * FROM refund_requests WHERE id = ?').get(requestId) as RefundRequestRow;
    res.status(201).json(request);
  } finally {
    db.close();
  }
});

router.post('/:id/approve', (req, res) => {
  const db = getDatabase();
  try {
    const { id } = req.params;
    const { approver } = req.body;

    const request = db.prepare('SELECT * FROM refund_requests WHERE id = ?').get(id) as RefundRequestRow | undefined;
    if (!request) {
      return res.status(404).json({ error: '申请不存在' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ error: '申请已处理' });
    }

    const card = db.prepare('SELECT * FROM member_cards WHERE id = ?').get(request.card_id) as MemberCardRow | undefined;
    if (!card) {
      return res.status(404).json({ error: '会员卡不存在' });
    }

    db.prepare('BEGIN TRANSACTION').run();

    try {
      db.prepare(`
        UPDATE refund_requests 
        SET status = 'approved', approver = ?, approved_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(approver, id);

      db.prepare(`
        UPDATE member_cards 
        SET status = 'refunded', principal_balance = 0, bonus_balance = 0, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(request.card_id);

      db.prepare(`
        INSERT INTO balance_ledger (id, card_id, type, amount, principal_amount, bonus_amount, balance_after, principal_after, bonus_after, source, source_id, operator, remark, is_exception, exception_type)
        VALUES (?, ?, 'refund', ?, ?, ?, 0, 0, 0, 'refund', ?, ?, '退卡', 0, NULL)
      `).run(
        generateId('ledger'),
        request.card_id,
        -request.refund_amount,
        -request.principal_balance,
        -request.bonus_balance,
        id,
        approver
      );

      db.prepare(`
        INSERT INTO audit_logs (id, action, module, operator, details)
        VALUES (?, ?, ?, ?, ?)
      `).run(generateId('audit'), 'approve_refund', 'refund', approver, JSON.stringify({
        requestId: id,
        cardId: request.card_id,
        refundAmount: request.refund_amount
      }));

      db.prepare('COMMIT').run();

      const updated = db.prepare('SELECT * FROM refund_requests WHERE id = ?').get(id) as RefundRequestRow;
      res.json(updated);
    } catch (e) {
      db.prepare('ROLLBACK').run();
      throw e;
    }
  } finally {
    db.close();
  }
});

router.post('/:id/reject', (req, res) => {
  const db = getDatabase();
  try {
    const { id } = req.params;
    const { approver, reason } = req.body;

    const request = db.prepare('SELECT * FROM refund_requests WHERE id = ?').get(id) as RefundRequestRow | undefined;
    if (!request) {
      return res.status(404).json({ error: '申请不存在' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ error: '申请已处理' });
    }

    db.prepare(`
      UPDATE refund_requests 
      SET status = 'rejected', approver = ?, reject_reason = ?
      WHERE id = ?
    `).run(approver, reason, id);

    db.prepare(`
      INSERT INTO audit_logs (id, action, module, operator, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(generateId('audit'), 'reject_refund', 'refund', approver, JSON.stringify({
      requestId: id,
      reason
    }));

    const updated = db.prepare('SELECT * FROM refund_requests WHERE id = ?').get(id) as RefundRequestRow;
    res.json(updated);
  } finally {
    db.close();
  }
});

export default router;
