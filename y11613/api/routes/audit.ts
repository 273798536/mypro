import { Router } from 'express';
import { getDatabase } from '../database/init.js';

const router = Router();

router.get('/logs', (req, res) => {
  const db = getDatabase();
  try {
    const { module, action, operator, limit = 100 } = req.query;
    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: (string | number)[] = [];

    if (module) {
      sql += ' AND module = ?';
      params.push(module as string);
    }
    if (action) {
      sql += ' AND action = ?';
      params.push(action as string);
    }
    if (operator) {
      sql += ' AND operator LIKE ?';
      params.push(`%${operator}%`);
    }
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(Number(limit));

    const logs = db.prepare(sql).all(...params);
    res.json(logs.map(l => ({
      ...l,
      details: l.details ? JSON.parse(l.details) : null
    })));
  } finally {
    db.close();
  }
});

router.get('/exceptions', (req, res) => {
  const db = getDatabase();
  try {
    const exceptions = db.prepare(`
      SELECT l.*, c.card_no, c.user_name
      FROM balance_ledger l
      LEFT JOIN member_cards c ON l.card_id = c.id
      WHERE l.is_exception = 1
      ORDER BY l.created_at DESC
      LIMIT 50
    `).all();
    res.json(exceptions);
  } finally {
    db.close();
  }
});

router.get('/snapshots', (req, res) => {
  const db = getDatabase();
  try {
    const { date } = req.query;
    let sql = `
      SELECT s.*, c.card_no, c.user_name
      FROM balance_snapshots s
      LEFT JOIN member_cards c ON s.card_id = c.id
      WHERE 1=1
    `;
    const params: string[] = [];

    if (date) {
      sql += ' AND s.snapshot_date = ?';
      params.push(date as string);
    }
    sql += ' ORDER BY s.snapshot_date DESC, s.created_at DESC';

    const snapshots = db.prepare(sql).all(...params);
    res.json(snapshots);
  } finally {
    db.close();
  }
});

router.get('/export', (req, res) => {
  const db = getDatabase();
  try {
    const { type, startDate, endDate } = req.query;

    let data: any = {};

    if (!type || type === 'ledger') {
      let sql = `
        SELECT l.*, c.card_no, c.user_name
        FROM balance_ledger l
        LEFT JOIN member_cards c ON l.card_id = c.id
        WHERE 1=1
      `;
      const params: string[] = [];
      if (startDate) {
        sql += ' AND DATE(l.created_at) >= ?';
        params.push(startDate as string);
      }
      if (endDate) {
        sql += ' AND DATE(l.created_at) <= ?';
        params.push(endDate as string);
      }
      sql += ' ORDER BY l.created_at DESC';
      data.ledger = db.prepare(sql).all(...params);
    }

    if (!type || type === 'cards') {
      data.cards = db.prepare('SELECT * FROM member_cards ORDER BY created_at DESC').all();
    }

    if (!type || type === 'recharge') {
      data.recharge = db.prepare(`
        SELECT r.*, c.card_no, c.user_name
        FROM recharge_records r
        LEFT JOIN member_cards c ON r.card_id = c.id
        ORDER BY r.created_at DESC
      `).all();
    }

    if (!type || type === 'consumption') {
      data.consumption = db.prepare(`
        SELECT cn.*, c.card_no, c.user_name
        FROM consumptions cn
        LEFT JOIN member_cards c ON cn.card_id = c.id
        ORDER BY cn.created_at DESC
      `).all();
    }

    res.json(data);
  } finally {
    db.close();
  }
});

export default router;
