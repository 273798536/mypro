import { Router } from 'express';
import { getDatabase } from '../database/init.js';

const router = Router();

router.get('/summary', (req, res) => {
  const db = getDatabase();
  try {
    const totalCards = db.prepare(`
      SELECT COUNT(*) as count FROM member_cards WHERE status = 'active'
    `).get() as { count: number };

    const balances = db.prepare(`
      SELECT 
        SUM(principal_balance) as total_principal,
        SUM(bonus_balance) as total_bonus
      FROM member_cards 
      WHERE status = 'active'
    `).get() as { total_principal: number; total_bonus: number };

    const exceptionCount = db.prepare(`
      SELECT COUNT(*) as count FROM balance_ledger WHERE is_exception = 1
    `).get() as { count: number };

    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    const monthRecharge = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM recharge_records 
      WHERE DATE(created_at) >= ?
    `).get(monthStartStr) as { total: number };

    const monthConsume = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM consumptions 
      WHERE DATE(created_at) >= ? AND is_reversed = 0
    `).get(monthStartStr) as { total: number };

    res.json({
      totalCards: totalCards.count,
      totalPrincipal: balances.total_principal || 0,
      totalBonus: balances.total_bonus || 0,
      totalBalance: (balances.total_principal || 0) + (balances.total_bonus || 0),
      exceptionCount: exceptionCount.count,
      monthRecharge: monthRecharge.total,
      monthConsume: monthConsume.total
    });
  } finally {
    db.close();
  }
});

router.get('/trend', (req, res) => {
  const db = getDatabase();
  try {
    const { days = 30 } = req.query;
    const limitDays = Number(days);

    const data = db.prepare(`
      SELECT 
        DATE(created_at) as date,
        SUM(CASE WHEN type = 'recharge' THEN amount ELSE 0 END) as recharge,
        SUM(CASE WHEN type = 'consume' THEN ABS(amount) ELSE 0 END) as consume
      FROM balance_ledger
      WHERE DATE(created_at) >= DATE('now', '-' || ? || ' days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all(limitDays);

    res.json(data);
  } finally {
    db.close();
  }
});

router.get('/store-stats', (req, res) => {
  const db = getDatabase();
  try {
    const stats = db.prepare(`
      SELECT 
        store_id,
        store_name,
        COUNT(*) as transaction_count,
        SUM(amount) as total_amount,
        SUM(CASE WHEN is_cross_store = 1 THEN 1 ELSE 0 END) as cross_store_count
      FROM consumptions
      WHERE is_reversed = 0
      GROUP BY store_id, store_name
      ORDER BY total_amount DESC
    `).all();

    res.json(stats);
  } finally {
    db.close();
  }
});

router.get('/recent-exceptions', (req, res) => {
  const db = getDatabase();
  try {
    const exceptions = db.prepare(`
      SELECT l.*, c.card_no, c.user_name
      FROM balance_ledger l
      LEFT JOIN member_cards c ON l.card_id = c.id
      WHERE l.is_exception = 1
      ORDER BY l.created_at DESC
      LIMIT 10
    `).all();

    res.json(exceptions);
  } finally {
    db.close();
  }
});

export default router;
