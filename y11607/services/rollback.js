const { getDb } = require('../db');

function computeRollback(caseNo) {
  const db = getDb();
  const c = db.prepare('SELECT * FROM arbitration_cases WHERE case_no = ?').get(caseNo);
  if (!c) throw new Error('工单不存在');

  const order = c.order_no ? db.prepare('SELECT * FROM merchant_orders WHERE order_no = ?').get(c.order_no) : null;
  const refunds = c.order_no ? db.prepare('SELECT * FROM refund_records WHERE order_no = ?').all(c.order_no) : [];
  const subsidies = c.order_no ? db.prepare('SELECT * FROM platform_subsidies WHERE order_no = ?').all(c.order_no) : [];

  const actions = [];

  if (order) {
    const originalRule = db.prepare('SELECT * FROM split_rules WHERE rule_version = ? AND merchant_id = ?')
      .get(order.rule_version, c.merchant_id);

    for (const r of refunds) {
      const effectiveRule = db.prepare(`
        SELECT * FROM split_rules WHERE merchant_id = ?
        AND effective_from <= ? AND (effective_to IS NULL OR effective_to >= ?)
        AND status = 'active' ORDER BY effective_from DESC LIMIT 1
      `).get(c.merchant_id, r.refund_date, r.refund_date);

      if (originalRule && effectiveRule && originalRule.rule_version !== effectiveRule.rule_version) {
        const diff = r.refund_amount * (effectiveRule.merchant_ratio - originalRule.merchant_ratio);
        actions.push({
          type: 'rule_version_correction',
          refund_no: r.refund_no,
          refund_settle_date: r.settle_date,
          original_ratio: originalRule.merchant_ratio,
          effective_ratio: effectiveRule.merchant_ratio,
          diff_amount: parseFloat(diff.toFixed(2)),
          direction: diff > 0 ? 'platform_to_merchant' : 'merchant_to_platform',
          description: `退款${r.refund_no}规则版本错配修正`,
        });
      }
    }
  }

  const subBatchGroups = {};
  for (const s of subsidies) {
    if (!subBatchGroups[s.subsidy_batch_no]) subBatchGroups[s.subsidy_batch_no] = [];
    subBatchGroups[s.subsidy_batch_no].push(s);
  }
  for (const [batch, items] of Object.entries(subBatchGroups)) {
    if (items.length > 1) {
      const excess = items.slice(1);
      for (const dup of excess) {
        actions.push({
          type: 'subsidy_reversal',
          subsidy_batch_no: batch,
          subsidy_id: dup.id,
          subsidy_amount: dup.subsidy_amount,
          settle_date: dup.settle_date,
          direction: 'merchant_to_platform',
          description: `补贴批次${batch}重复入账冲正`,
        });
      }
    }
  }

  return actions;
}

function executeRollback(caseNo, actions, operator) {
  const db = getDb();
  const tx = db.transaction(() => {
    const logs = [];
    for (const a of actions) {
      if (a.type === 'rule_version_correction') {
        const logId = db.prepare(`
          INSERT INTO balance_rollback_log (case_no, merchant_id, rollback_amount, direction, target_settle_date, reason, operator)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          caseNo,
          db.prepare('SELECT merchant_id FROM arbitration_cases WHERE case_no = ?').get(caseNo).merchant_id,
          Math.abs(a.diff_amount),
          a.direction,
          a.refund_settle_date,
          a.description,
          operator || 'system'
        ).lastInsertRowid;
        logs.push({ id: logId, ...a });
      } else if (a.type === 'subsidy_reversal') {
        db.prepare('UPDATE platform_subsidies SET is_reversed = 1, reversed_by = ? WHERE id = ?')
          .run(caseNo, a.subsidy_id);
        const logId = db.prepare(`
          INSERT INTO balance_rollback_log (case_no, merchant_id, rollback_amount, direction, target_settle_date, reason, operator)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          caseNo,
          db.prepare('SELECT merchant_id FROM arbitration_cases WHERE case_no = ?').get(caseNo).merchant_id,
          a.subsidy_amount,
          'merchant_to_platform',
          a.settle_date,
          a.description,
          operator || 'system'
        ).lastInsertRowid;
        logs.push({ id: logId, ...a });
      }
    }
    return logs;
  });
  return tx();
}

function getRollbackLogs(caseNo) {
  const db = getDb();
  if (caseNo) {
    return db.prepare('SELECT * FROM balance_rollback_log WHERE case_no = ? ORDER BY created_at DESC').all(caseNo);
  }
  return db.prepare('SELECT * FROM balance_rollback_log ORDER BY created_at DESC LIMIT 100').all();
}

function getCorrectionHistory(caseNo) {
  const db = getDb();
  return db.prepare('SELECT * FROM arbitration_corrections WHERE case_no = ? ORDER BY created_at DESC').all(caseNo);
}

function recordCorrection(caseNo, correctionType, targetRecord, originalValue, correctedValue, operator, reason) {
  const db = getDb();
  return db.prepare(`
    INSERT INTO arbitration_corrections (case_no, correction_type, target_record, original_value, corrected_value, operator, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(caseNo, correctionType, targetRecord, originalValue || null, correctedValue, operator || 'system', reason || null).lastInsertRowid;
}

module.exports = {
  computeRollback, executeRollback, getRollbackLogs,
  getCorrectionHistory, recordCorrection,
};
