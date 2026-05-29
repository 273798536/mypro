import { Router } from 'express';
import { getDatabase } from '../database/init.js';
import { generateId, calculateBonus } from '../utils/index.js';
import type { MemberCardRow, BonusRuleRow, RechargeRecordRow, RechargeWithCard } from '../types/index.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDatabase();
  try {
    const { cardId } = req.query;
    let sql = `
      SELECT r.*, c.card_no, c.user_name 
      FROM recharge_records r
      LEFT JOIN member_cards c ON r.card_id = c.id
      WHERE 1=1
    `;
    const params: string[] = [];

    if (cardId) {
      sql += ' AND r.card_id = ?';
      params.push(cardId as string);
    }
    sql += ' ORDER BY r.created_at DESC';

    const records = db.prepare(sql).all(...params) as RechargeWithCard[];
    res.json(records);
  } finally {
    db.close();
  }
});

router.post('/', (req, res) => {
  const db = getDatabase();
  try {
    const { cardId, principalAmount, ruleId, operator, source, remark } = req.body;

    const card = db.prepare('SELECT * FROM member_cards WHERE id = ?').get(cardId) as MemberCardRow | undefined;
    if (!card) {
      return res.status(404).json({ error: '会员卡不存在' });
    }
    if (card.status !== 'active') {
      return res.status(400).json({ error: '会员卡状态异常，无法充值' });
    }

    let bonusAmount = 0;
    if (ruleId) {
      const rule = db.prepare('SELECT * FROM bonus_rules WHERE id = ? AND is_active = 1').get(ruleId) as BonusRuleRow | undefined;
      if (rule) {
        const tiers = JSON.parse(rule.tiers);
        bonusAmount = calculateBonus(principalAmount, tiers);
      }
    }

    const rechargeId = generateId('recharge');
    const totalAmount = principalAmount + bonusAmount;

    const newPrincipal = card.principal_balance + principalAmount;
    const newBonus = card.bonus_balance + bonusAmount;
    const newTotal = newPrincipal + newBonus;

    db.prepare('BEGIN TRANSACTION').run();

    try {
      db.prepare(`
        INSERT INTO recharge_records (id, card_id, rule_id, principal_amount, bonus_amount, total_amount, operator, source, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(rechargeId, cardId, ruleId || null, principalAmount, bonusAmount, totalAmount, operator, source || null, remark || null);

      db.prepare(`
        UPDATE member_cards 
        SET principal_balance = ?, bonus_balance = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newPrincipal, newBonus, cardId);

      db.prepare(`
        INSERT INTO balance_ledger (id, card_id, type, amount, principal_amount, bonus_amount, balance_after, principal_after, bonus_after, source, source_id, operator, remark)
        VALUES (?, ?, 'recharge', ?, ?, ?, ?, ?, ?, 'recharge', ?, ?, ?)
      `).run(generateId('ledger'), cardId, totalAmount, principalAmount, bonusAmount, newTotal, newPrincipal, newBonus, rechargeId, operator, remark || '充值');

      db.prepare(`
        INSERT INTO audit_logs (id, action, module, operator, details)
        VALUES (?, ?, ?, ?, ?)
      `).run(generateId('audit'), 'recharge', 'card', operator, JSON.stringify({ cardId, principalAmount, bonusAmount, rechargeId }));

      db.prepare('COMMIT').run();

      const record = db.prepare('SELECT * FROM recharge_records WHERE id = ?').get(rechargeId) as RechargeRecordRow;
      res.status(201).json(record);
    } catch (e) {
      db.prepare('ROLLBACK').run();
      throw e;
    }
  } finally {
    db.close();
  }
});

export default router;
