import { Router } from 'express';
import { getDatabase } from '../database/init.js';
import { generateId, splitConsumptionAmount, detectException } from '../utils/index.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDatabase();
  try {
    const { cardId, storeId, isReversed } = req.query;
    let sql = `
      SELECT c.*, m.card_no, m.user_name
      FROM consumptions c
      LEFT JOIN member_cards m ON c.card_id = m.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (cardId) {
      sql += ' AND c.card_id = ?';
      params.push(cardId as string);
    }
    if (storeId) {
      sql += ' AND c.store_id = ?';
      params.push(storeId as string);
    }
    if (isReversed !== undefined) {
      sql += ' AND c.is_reversed = ?';
      params.push(isReversed === 'true' ? 1 : 0);
    }
    sql += ' ORDER BY c.created_at DESC';

    const records = db.prepare(sql).all(...params);
    res.json(records);
  } finally {
    db.close();
  }
});

router.post('/', (req, res) => {
  const db = getDatabase();
  try {
    const { cardId, storeId, amount, operator, remark } = req.body;

    const card = db.prepare('SELECT * FROM member_cards WHERE id = ?').get(cardId);
    if (!card) {
      return res.status(404).json({ error: '会员卡不存在' });
    }

    const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(storeId);
    if (!store) {
      return res.status(404).json({ error: '门店不存在' });
    }

    const totalBalance = card.principal_balance + card.bonus_balance;
    if (totalBalance < amount) {
      return res.status(400).json({ error: '余额不足' });
    }

    const rule = db.prepare('SELECT * FROM bonus_rules WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1').get();
    const priority = rule?.priority || 'bonus_first';

    const { principalUsed, bonusUsed } = splitConsumptionAmount(
      amount,
      card.principal_balance,
      card.bonus_balance,
      priority
    );

    const isCrossStore = store.code !== 'STORE001';
    const exception = detectException(card.status, false, isCrossStore);

    const consumptionId = generateId('consume');
    const newPrincipal = card.principal_balance - principalUsed;
    const newBonus = card.bonus_balance - bonusUsed;
    const newTotal = newPrincipal + newBonus;

    db.prepare('BEGIN TRANSACTION').run();

    try {
      db.prepare(`
        INSERT INTO consumptions (id, card_id, store_id, store_name, amount, principal_used, bonus_used, is_cross_store, is_reversed, operator)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
      `).run(consumptionId, cardId, storeId, store.name, amount, principalUsed, bonusUsed, isCrossStore ? 1 : 0, operator);

      db.prepare(`
        UPDATE member_cards 
        SET principal_balance = ?, bonus_balance = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newPrincipal, newBonus, cardId);

      db.prepare(`
        INSERT INTO balance_ledger (id, card_id, type, amount, principal_amount, bonus_amount, balance_after, principal_after, bonus_after, source, source_id, operator, remark, is_exception, exception_type)
        VALUES (?, ?, 'consume', ?, ?, ?, ?, ?, ?, 'consume', ?, ?, ?, ?, ?)
      `).run(
        generateId('ledger'),
        cardId,
        -amount,
        -principalUsed,
        -bonusUsed,
        newTotal,
        newPrincipal,
        newBonus,
        consumptionId,
        operator,
        remark || `消费 - ${store.name}`,
        exception.isException ? 1 : 0,
        exception.exceptionType || null
      );

      db.prepare(`
        INSERT INTO audit_logs (id, action, module, operator, details)
        VALUES (?, ?, ?, ?, ?)
      `).run(generateId('audit'), 'consume', 'card', operator, JSON.stringify({
        cardId,
        storeId,
        amount,
        principalUsed,
        bonusUsed,
        isCrossStore,
        isException: exception.isException,
        exceptionType: exception.exceptionType
      }));

      db.prepare('COMMIT').run();

      const record = db.prepare('SELECT * FROM consumptions WHERE id = ?').get(consumptionId);
      res.status(201).json({
        ...record,
        isException: exception.isException,
        exceptionType: exception.exceptionType,
        warning: exception.isException ? getExceptionWarning(exception.exceptionType!) : null
      });
    } catch (e) {
      db.prepare('ROLLBACK').run();
      throw e;
    }
  } finally {
    db.close();
  }
});

router.post('/:id/reverse', (req, res) => {
  const db = getDatabase();
  try {
    const { id } = req.params;
    const { operator, reason } = req.body;

    const consumption = db.prepare('SELECT * FROM consumptions WHERE id = ?').get(id);
    if (!consumption) {
      return res.status(404).json({ error: '消费记录不存在' });
    }
    if (consumption.is_reversed) {
      return res.status(400).json({ error: '该消费已撤销' });
    }

    const card = db.prepare('SELECT * FROM member_cards WHERE id = ?').get(consumption.card_id);
    if (!card) {
      return res.status(404).json({ error: '会员卡不存在' });
    }

    const exception = detectException(card.status, true, consumption.is_cross_store);

    const newPrincipal = card.principal_balance + consumption.principal_used;
    const newBonus = card.bonus_balance + consumption.bonus_used;
    const newTotal = newPrincipal + newBonus;

    db.prepare('BEGIN TRANSACTION').run();

    try {
      db.prepare(`
        UPDATE consumptions 
        SET is_reversed = 1, reversed_at = CURRENT_TIMESTAMP, reverse_reason = ?
        WHERE id = ?
      `).run(reason, id);

      db.prepare(`
        UPDATE member_cards 
        SET principal_balance = ?, bonus_balance = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newPrincipal, newBonus, consumption.card_id);

      db.prepare(`
        INSERT INTO balance_ledger (id, card_id, type, amount, principal_amount, bonus_amount, balance_after, principal_after, bonus_after, source, source_id, operator, remark, is_exception, exception_type)
        VALUES (?, ?, 'reverse', ?, ?, ?, ?, ?, ?, 'consume_reverse', ?, ?, ?, ?, ?)
      `).run(
        generateId('ledger'),
        consumption.card_id,
        consumption.amount,
        consumption.principal_used,
        consumption.bonus_used,
        newTotal,
        newPrincipal,
        newBonus,
        id,
        operator,
        `撤销消费 - ${reason}`,
        exception.isException ? 1 : 0,
        exception.exceptionType || null
      );

      db.prepare(`
        INSERT INTO audit_logs (id, action, module, operator, details)
        VALUES (?, ?, ?, ?, ?)
      `).run(generateId('audit'), 'reverse_consume', 'card', operator, JSON.stringify({
        consumptionId: id,
        cardId: consumption.card_id,
        amount: consumption.amount,
        reason,
        isCrossStore: consumption.is_cross_store,
        isException: exception.isException
      }));

      db.prepare('COMMIT').run();

      const updated = db.prepare('SELECT * FROM consumptions WHERE id = ?').get(id);
      res.json({
        ...updated,
        isException: exception.isException,
        warning: exception.isException ? getExceptionWarning(exception.exceptionType!) : null
      });
    } catch (e) {
      db.prepare('ROLLBACK').run();
      throw e;
    }
  } finally {
    db.close();
  }
});

function getExceptionWarning(type: string): string {
  const warnings: Record<string, string> = {
    'consume_after_refund': '警告：该卡已申请退卡但仍在消费，请核实！',
    'cross_store_reverse': '注意：跨店消费撤销已记录，需门店对账确认'
  };
  return warnings[type] || '异常操作已记录';
}

export default router;
