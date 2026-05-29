import { Router } from 'express';
import { getDatabase } from '../database/init.js';
import { generateId } from '../utils/index.js';
import type { MemberCardRow, BalanceLedgerRow, ConsumptionRow } from '../types/index.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDatabase();
  try {
    const { status, search } = req.query;
    let sql = 'SELECT * FROM member_cards WHERE 1=1';
    const params: string[] = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status as string);
    }
    if (search) {
      sql += ' AND (card_no LIKE ? OR user_name LIKE ? OR phone LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    sql += ' ORDER BY created_at DESC';

    const cards = db.prepare(sql).all(...params) as MemberCardRow[];
    res.json(cards);
  } finally {
    db.close();
  }
});

router.get('/:id', (req, res) => {
  const db = getDatabase();
  try {
    const card = db.prepare('SELECT * FROM member_cards WHERE id = ?').get(req.params.id) as MemberCardRow | undefined;
    if (!card) {
      return res.status(404).json({ error: '会员卡不存在' });
    }
    res.json(card);
  } finally {
    db.close();
  }
});

router.post('/', (req, res) => {
  const db = getDatabase();
  try {
    const { cardNo, userName, phone, operator } = req.body;
    const id = generateId('card');

    db.prepare(`
      INSERT INTO member_cards (id, card_no, user_name, phone, principal_balance, bonus_balance, status)
      VALUES (?, ?, ?, ?, 0, 0, 'active')
    `).run(id, cardNo, userName, phone);

    db.prepare(`
      INSERT INTO audit_logs (id, action, module, operator, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(generateId('audit'), 'create', 'card', operator, JSON.stringify({ cardNo, userName }));

    const card = db.prepare('SELECT * FROM member_cards WHERE id = ?').get(id) as MemberCardRow;
    res.status(201).json(card);
  } finally {
    db.close();
  }
});

router.get('/:id/ledger', (req, res) => {
  const db = getDatabase();
  try {
    const ledger = db.prepare(`
      SELECT * FROM balance_ledger 
      WHERE card_id = ? 
      ORDER BY created_at DESC
    `).all(req.params.id) as BalanceLedgerRow[];
    res.json(ledger);
  } finally {
    db.close();
  }
});

router.get('/:id/consumptions', (req, res) => {
  const db = getDatabase();
  try {
    const consumptions = db.prepare(`
      SELECT * FROM consumptions 
      WHERE card_id = ? 
      ORDER BY created_at DESC
    `).all(req.params.id) as ConsumptionRow[];
    res.json(consumptions);
  } finally {
    db.close();
  }
});

router.patch('/:id/status', (req, res) => {
  const db = getDatabase();
  try {
    const { status, operator } = req.body;
    const { id } = req.params;

    const card = db.prepare('SELECT * FROM member_cards WHERE id = ?').get(id) as MemberCardRow | undefined;
    if (!card) {
      return res.status(404).json({ error: '会员卡不存在' });
    }

    db.prepare(`
      UPDATE member_cards 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, id);

    db.prepare(`
      INSERT INTO audit_logs (id, action, module, operator, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(generateId('audit'), 'update_status', 'card', operator, JSON.stringify({ cardId: id, from: card.status, to: status }));

    const updatedCard = db.prepare('SELECT * FROM member_cards WHERE id = ?').get(id) as MemberCardRow;
    res.json(updatedCard);
  } finally {
    db.close();
  }
});

export default router;
