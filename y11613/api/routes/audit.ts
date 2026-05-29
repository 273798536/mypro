import { Router } from 'express';
import { getDatabase } from '../database/init.js';
import { generateId } from '../utils/index.js';
import type { AuditLogRow, LedgerWithCard, SnapshotWithCard, MemberCardRow, RechargeWithCard, ConsumptionWithCard } from '../types/index.js';

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

    const logs = db.prepare(sql).all(...params) as AuditLogRow[];
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
    `).all() as LedgerWithCard[];
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

    const snapshots = db.prepare(sql).all(...params) as SnapshotWithCard[];
    res.json(snapshots);
  } finally {
    db.close();
  }
});

router.post('/snapshots/generate', (req, res) => {
  const db = getDatabase();
  try {
    const { operator } = req.body;
    const today = new Date().toISOString().split('T')[0];

    const cards = db.prepare(`
      SELECT id, principal_balance, bonus_balance 
      FROM member_cards 
      WHERE status = 'active'
    `).all() as Array<{ id: string; principal_balance: number; bonus_balance: number }>;

    db.prepare('BEGIN TRANSACTION').run();
    try {
      const insertStmt = db.prepare(`
        INSERT OR REPLACE INTO balance_snapshots (id, snapshot_date, card_id, principal_balance, bonus_balance, total_balance)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const card of cards) {
        insertStmt.run(
          generateId('snapshot'),
          today,
          card.id,
          card.principal_balance,
          card.bonus_balance,
          card.principal_balance + card.bonus_balance
        );
      }

      db.prepare(`
        INSERT INTO audit_logs (id, action, module, operator, details)
        VALUES (?, ?, ?, ?, ?)
      `).run(generateId('audit'), 'generate_snapshot', 'audit', operator || 'system', JSON.stringify({
        date: today,
        cardCount: cards.length
      }));

      db.prepare('COMMIT').run();

      const snapshots = db.prepare(`
        SELECT s.*, c.card_no, c.user_name
        FROM balance_snapshots s
        LEFT JOIN member_cards c ON s.card_id = c.id
        WHERE s.snapshot_date = ?
        ORDER BY c.card_no
      `).all(today) as SnapshotWithCard[];

      res.status(201).json({
        date: today,
        count: cards.length,
        snapshots
      });
    } catch (e) {
      db.prepare('ROLLBACK').run();
      throw e;
    }
  } finally {
    db.close();
  }
});

router.get('/export', (req, res) => {
  const db = getDatabase();
  try {
    const { type, startDate, endDate, format } = req.query;

    let data: Record<string, unknown[]> = {};

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
      data.ledger = db.prepare(sql).all(...params) as LedgerWithCard[];
    }

    if (!type || type === 'cards') {
      data.cards = db.prepare('SELECT * FROM member_cards ORDER BY created_at DESC').all() as MemberCardRow[];
    }

    if (!type || type === 'recharge') {
      data.recharge = db.prepare(`
        SELECT r.*, c.card_no, c.user_name
        FROM recharge_records r
        LEFT JOIN member_cards c ON r.card_id = c.id
        ORDER BY r.created_at DESC
      `).all() as RechargeWithCard[];
    }

    if (!type || type === 'consumption') {
      data.consumption = db.prepare(`
        SELECT cn.*, c.card_no, c.user_name
        FROM consumptions cn
        LEFT JOIN member_cards c ON cn.card_id = c.id
        ORDER BY cn.created_at DESC
      `).all() as ConsumptionWithCard[];
    }

    if (format === 'csv') {
      const sections: string[] = [];
      for (const [key, rows] of Object.entries(data)) {
        if (rows.length === 0) continue;
        sections.push(`\n=== ${key} ===`);
        const headers = Object.keys(rows[0] as object);
        sections.push(headers.join(','));
        for (const row of rows) {
          const values = headers.map(h => {
            const val = (row as Record<string, unknown>)[h];
            const str = val === null || val === undefined ? '' : String(val);
            return str.includes(',') ? `"${str}"` : str;
          });
          sections.push(values.join(','));
        }
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=audit-export-${Date.now()}.csv`);
      res.send('\uFEFF' + sections.join('\n'));
    } else {
      res.json(data);
    }
  } finally {
    db.close();
  }
});

export default router;
