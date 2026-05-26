const { getDb } = require('../db');

function detectAll() {
  const db = getDb();
  const results = [];

  results.push(...detectRefundCrossSettleDate(db));
  results.push(...detectRuleVersionMismatch(db));
  results.push(...detectDuplicateSubsidy(db));

  return results;
}

function detectForCase(caseNo) {
  const db = getDb();
  const c = db.prepare('SELECT * FROM arbitration_cases WHERE case_no = ?').get(caseNo);
  if (!c) return [];

  const results = [];

  if (c.order_no) {
    const refunds = db.prepare(
      'SELECT * FROM refund_records WHERE order_no = ?'
    ).all(c.order_no);
    const order = db.prepare('SELECT * FROM merchant_orders WHERE order_no = ?').get(c.order_no);
    if (order) {
      for (const r of refunds) {
        if (r.settle_date !== order.settle_date) {
          results.push({
            anomaly_type: 'refund_cross_settle_date',
            severity: 'critical',
            description: `退款${r.refund_no}的结算日(${r.settle_date})与订单${order.order_no}的结算日(${order.settle_date})不一致，退款跨结算日`,
            related_order: order.order_no,
            related_refund: r.refund_no,
            extra_info: JSON.stringify({
              order_settle_date: order.settle_date,
              refund_settle_date: r.settle_date,
              refund_amount: r.refund_amount,
              refund_date: r.refund_date,
            }),
          });
        }

        const orderRule = db.prepare(
          'SELECT * FROM split_rules WHERE rule_version = ? AND merchant_id = ?'
        ).get(order.rule_version, order.merchant_id);

        if (orderRule) {
          const refundDate = r.refund_date;
          const effectiveRule = db.prepare(
            `SELECT * FROM split_rules WHERE merchant_id = ?
             AND effective_from <= ? AND (effective_to IS NULL OR effective_to >= ?)
             AND status = 'active'
             ORDER BY effective_from DESC LIMIT 1`
          ).get(order.merchant_id, refundDate, refundDate);

          if (effectiveRule && effectiveRule.rule_version !== order.rule_version) {
            results.push({
              anomaly_type: 'rule_version_mismatch',
              severity: 'critical',
              description: `退款${r.refund_no}发生时(${refundDate})生效规则为${effectiveRule.rule_version}(商户比例${effectiveRule.merchant_ratio*100}%)，但订单原规则为${order.rule_version}(商户比例${orderRule.merchant_ratio*100}%)，可能导致分账金额偏差`,
              related_order: order.order_no,
              related_refund: r.refund_no,
              extra_info: JSON.stringify({
                order_rule_version: order.rule_version,
                order_merchant_ratio: orderRule.merchant_ratio,
                effective_rule_version: effectiveRule.rule_version,
                effective_merchant_ratio: effectiveRule.merchant_ratio,
                refund_date: refundDate,
                diff_amount: r.refund_amount * (effectiveRule.merchant_ratio - orderRule.merchant_ratio),
              }),
            });
          }
        }
      }
    }

    const subsidies = db.prepare(
      'SELECT * FROM platform_subsidies WHERE order_no = ?'
    ).all(c.order_no);
    const batchGroups = {};
    for (const s of subsidies) {
      if (!batchGroups[s.subsidy_batch_no]) batchGroups[s.subsidy_batch_no] = [];
      batchGroups[s.subsidy_batch_no].push(s);
    }
    for (const [batch, items] of Object.entries(batchGroups)) {
      if (items.length > 1) {
        results.push({
          anomaly_type: 'duplicate_subsidy',
          severity: 'critical',
          description: `订单${c.order_no}的补贴批次${batch}出现${items.length}次入账，疑似重复入账，涉及金额${items.reduce((a,b)=>a+b.subsidy_amount,0).toFixed(2)}元`,
          related_order: c.order_no,
          related_subsidy: batch,
          extra_info: JSON.stringify({
            subsidy_batch_no: batch,
            count: items.length,
            total_amount: items.reduce((a,b)=>a+b.subsidy_amount,0),
            records: items.map(i => ({ id: i.id, subsidy_amount: i.subsidy_amount, settle_date: i.settle_date })),
          }),
        });
      }
    }
  }

  return results;
}

function detectRefundCrossSettleDate(db) {
  const rows = db.prepare(`
    SELECT r.refund_no, r.order_no, r.refund_amount, r.refund_date, r.settle_date AS refund_settle_date,
           o.settle_date AS order_settle_date, o.merchant_id
    FROM refund_records r
    JOIN merchant_orders o ON r.order_no = o.order_no
    WHERE r.settle_date != o.settle_date
  `).all();

  return rows.map(r => ({
    anomaly_type: 'refund_cross_settle_date',
    severity: 'warning',
    description: `退款${r.refund_no}(商户${r.merchant_id})结算日(${r.refund_settle_date})与订单结算日(${r.order_settle_date})不一致`,
    related_order: r.order_no,
    related_refund: r.refund_no,
    extra_info: JSON.stringify({
      order_settle_date: r.order_settle_date,
      refund_settle_date: r.refund_settle_date,
      refund_amount: r.refund_amount,
    }),
  }));
}

function detectRuleVersionMismatch(db) {
  const rows = db.prepare(`
    SELECT r.refund_no, r.order_no, r.refund_amount, r.refund_date, o.rule_version AS order_rule,
           o.merchant_id, o.amount AS order_amount
    FROM refund_records r
    JOIN merchant_orders o ON r.order_no = o.order_no
  `).all();

  const results = [];
  for (const r of rows) {
    const orderRule = db.prepare('SELECT merchant_ratio FROM split_rules WHERE rule_version = ? AND merchant_id = ?')
      .get(r.order_rule, r.merchant_id);
    if (!orderRule) continue;

    const effectiveRule = db.prepare(`
      SELECT rule_version, merchant_ratio FROM split_rules
      WHERE merchant_id = ? AND effective_from <= ? AND (effective_to IS NULL OR effective_to >= ?)
      AND status = 'active' ORDER BY effective_from DESC LIMIT 1
    `).get(r.merchant_id, r.refund_date, r.refund_date);

    if (effectiveRule && effectiveRule.rule_version !== r.order_rule) {
      results.push({
        anomaly_type: 'rule_version_mismatch',
        severity: 'critical',
        description: `退款${r.refund_no}: 订单规则${r.order_rule}(商户${orderRule.merchant_ratio*100}%) vs 退款时生效规则${effectiveRule.rule_version}(商户${effectiveRule.merchant_ratio*100}%)`,
        related_order: r.order_no,
        related_refund: r.refund_no,
        extra_info: JSON.stringify({
          order_rule_version: r.order_rule,
          order_merchant_ratio: orderRule.merchant_ratio,
          effective_rule_version: effectiveRule.rule_version,
          effective_merchant_ratio: effectiveRule.merchant_ratio,
          diff_amount: (r.refund_amount * (effectiveRule.merchant_ratio - orderRule.merchant_ratio)).toFixed(2),
        }),
      });
    }
  }
  return results;
}

function detectDuplicateSubsidy(db) {
  const rows = db.prepare(`
    SELECT subsidy_batch_no, order_no, merchant_id, settle_date,
           COUNT(*) AS cnt, SUM(subsidy_amount) AS total_amount
    FROM platform_subsidies
    GROUP BY subsidy_batch_no, order_no
    HAVING cnt > 1
  `).all();

  return rows.map(r => ({
    anomaly_type: 'duplicate_subsidy',
    severity: 'critical',
    description: `补贴批次${r.subsidy_batch_no}在订单${r.order_no}上重复入账${r.cnt}次，总额${r.total_amount.toFixed(2)}元`,
    related_order: r.order_no,
    related_subsidy: r.subsidy_batch_no,
    extra_info: JSON.stringify({
      subsidy_batch_no: r.subsidy_batch_no,
      count: r.cnt,
      total_amount: r.total_amount,
      settle_date: r.settle_date,
    }),
  }));
}

function saveAnomalies(caseNo, anomalies) {
  const db = getDb();
  const tx = db.transaction(() => {
    for (const a of anomalies) {
      db.prepare(`
        INSERT INTO anomalies (case_no, anomaly_type, severity, description, related_order, related_refund, related_subsidy, extra_info)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        caseNo || null,
        a.anomaly_type,
        a.severity,
        a.description,
        a.related_order || null,
        a.related_refund || null,
        a.related_subsidy || null,
        a.extra_info || null
      );
    }
  });
  tx();
  return anomalies.length;
}

function getAnomalies(caseNo) {
  const db = getDb();
  if (caseNo) {
    return db.prepare('SELECT * FROM anomalies WHERE case_no = ? ORDER BY created_at DESC').all(caseNo);
  }
  return db.prepare('SELECT * FROM anomalies ORDER BY created_at DESC LIMIT 100').all();
}

function markResolved(anomalyId) {
  const db = getDb();
  db.prepare('UPDATE anomalies SET resolved = 1 WHERE id = ?').run(anomalyId);
  return { id: anomalyId, resolved: true };
}

module.exports = {
  detectAll, detectForCase, detectRefundCrossSettleDate,
  detectRuleVersionMismatch, detectDuplicateSubsidy,
  saveAnomalies, getAnomalies, markResolved,
};
