const { getDb } = require("../db");
const crypto = require("crypto");

function uid() {
  return crypto.randomUUID();
}

const GUARDED_TYPES = new Set(["deposit", "subsidy_recovery", "cross_night_refund"]);

function createSettlement(contractId, periodStart, periodEnd) {
  const db = getDb();
  const contract = db.prepare("SELECT * FROM contracts WHERE id = ?").get(contractId);
  if (!contract) throw new Error("合同不存在: " + contractId);

  const orders = db
    .prepare(
      `SELECT * FROM orders
       WHERE contract_id = ? AND check_in >= ? AND check_out <= ?`
    )
    .all(contractId, periodStart, periodEnd);

  if (orders.length === 0) {
    throw new Error("该周期内无订单流水，无法创建结算单");
  }

  const id = uid();
  let totalGross = 0;
  let totalDeduction = 0;
  let totalNet = 0;

  const insertLine = db.prepare(`
    INSERT INTO settlement_lines
      (id, settlement_id, order_id, gross_amount, commission,
       cleaning_fee, deposit_held, subsidy_recovery, cross_night_refund,
       net_amount, flags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO settlements (id, contract_id, period_start, period_end)
       VALUES (?, ?, ?, ?)`
    ).run(id, contractId, periodStart, periodEnd);

    for (const o of orders) {
      const commission = Math.round(o.gross_amount * contract.commission_rate * 100) / 100;
      const cleaningFee = o.cleaning_fee || 0;
      const depositHeld = o.deposit || 0;
      const subsidyRecovery = o.subsidy || 0;

      let netAmount = o.gross_amount - commission - cleaningFee - depositHeld - subsidyRecovery;
      netAmount = Math.round(netAmount * 100) / 100;

      const flags = [];
      if (depositHeld > 0) flags.push("deposit_held");
      if (subsidyRecovery > 0) flags.push("subsidy_recovery");
      if (flags.length > 0) flags.push("requires_dispute_review");

      insertLine.run(
        uid(), id, o.id,
        o.gross_amount, commission, cleaningFee,
        depositHeld, subsidyRecovery, 0,
        netAmount, flags.join(",")
      );

      totalGross += o.gross_amount;
      totalDeduction += commission + cleaningFee + depositHeld + subsidyRecovery;
      totalNet += netAmount;
    }

    totalGross = Math.round(totalGross * 100) / 100;
    totalDeduction = Math.round(totalDeduction * 100) / 100;
    totalNet = Math.round(totalNet * 100) / 100;

    db.prepare(
      `UPDATE settlements SET total_gross = ?, total_deduction = ?, total_net = ? WHERE id = ?`
    ).run(totalGross, totalDeduction, totalNet, id);
  });

  tx();
  return getSettlement(id);
}

function getSettlement(id) {
  const db = getDb();
  const settlement = db.prepare("SELECT * FROM settlements WHERE id = ?").get(id);
  if (!settlement) return null;
  const lines = db.prepare("SELECT * FROM settlement_lines WHERE settlement_id = ?").all(id);
  const disputes = db.prepare("SELECT * FROM disputes WHERE settlement_id = ?").all(id);
  return { ...settlement, lines, disputes };
}

function listSettlements(filters = {}) {
  const db = getDb();
  let sql = "SELECT * FROM settlements WHERE 1=1";
  const params = [];
  if (filters.contract_id) {
    sql += " AND contract_id = ?";
    params.push(filters.contract_id);
  }
  if (filters.status) {
    sql += " AND status = ?";
    params.push(filters.status);
  }
  sql += " ORDER BY created_at DESC";
  return db.prepare(sql).all(...params);
}

function advanceStatus(id, action) {
  const db = getDb();
  const s = db.prepare("SELECT * FROM settlements WHERE id = ?").get(id);
  if (!s) throw new Error("结算单不存在: " + id);

  const validActions = {
    draft: "submit",
    pending_review: "review",
    reviewed: "settle",
  };

  const transitions = {
    draft: "pending_review",
    pending_review: "reviewed",
    reviewed: "settled",
  };

  const expectedAction = validActions[s.status];
  if (!expectedAction) throw new Error(`结算单状态 ${s.status} 无法继续推进`);
  if (action !== expectedAction) {
    throw new Error(`状态 ${s.status} 只允许 action=${expectedAction}，收到 action=${action}`);
  }

  if (action === "review") {
    const openDisputes = db
      .prepare("SELECT COUNT(*) AS cnt FROM disputes WHERE settlement_id = ? AND status = 'open'")
      .get(id);
    if (openDisputes.cnt > 0) {
      throw new Error("存在未解决的争议，无法通过复核。请先处理争议记录。");
    }

    const guardedLines = db
      .prepare(
        `SELECT * FROM settlement_lines
         WHERE settlement_id = ?
           AND flags LIKE '%requires_dispute_review%'`
      )
      .all(id);

    for (const line of guardedLines) {
      const closedDisputes = db
        .prepare("SELECT COUNT(*) AS cnt FROM disputes WHERE line_id = ? AND status != 'open'")
        .get(line.id);
      if (closedDisputes.cnt === 0) {
        throw new Error(
          `结算行 ${line.id} 包含需审核的抵扣项（${line.flags}），但未创建争议记录说明影响，无法复核通过。`
        );
      }
    }
  }

  const next = transitions[s.status];
  const now = new Date().toISOString();
  const extraSet = action === "review"
    ? ", reviewed_at = ?"
    : action === "settle"
      ? ", settled_at = ?"
      : "";

  db.prepare(`UPDATE settlements SET status = ?${extraSet} WHERE id = ?`).run(
    next,
    ...(extraSet ? [now] : []),
    id
  );

  return getSettlement(id);
}

function addDispute(settlementId, lineId, orderId, disputeType, amount, reason, affectedLines) {
  if (GUARDED_TYPES.has(disputeType)) {
    if (!reason || reason.trim().length === 0) {
      throw new Error(`${disputeType} 类型争议必须填写原因说明`);
    }
    if (!affectedLines || affectedLines.trim().length === 0) {
      throw new Error(`${disputeType} 类型争议必须标注影响的结算行 ID（affected_lines）`);
    }
  }

  const db = getDb();
  const line = db.prepare("SELECT * FROM settlement_lines WHERE id = ? AND settlement_id = ?").get(lineId, settlementId);
  if (!line) throw new Error("结算行不存在或不属于该结算单");

  const id = uid();
  db.prepare(
    `INSERT INTO disputes (id, settlement_id, line_id, order_id, dispute_type, amount, reason, affected_lines)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, settlementId, lineId, orderId, disputeType, amount, reason, affectedLines || "");

  if (GUARDED_TYPES.has(disputeType) && disputeType === "deposit") {
    db.prepare(
      `UPDATE settlement_lines SET deposit_held = ?, flags = flags || ',deposit_disputed' WHERE id = ?`
    ).run(amount, lineId);
  }
  if (GUARDED_TYPES.has(disputeType) && disputeType === "subsidy_recovery") {
    db.prepare(
      `UPDATE settlement_lines SET subsidy_recovery = ?, flags = flags || ',subsidy_disputed' WHERE id = ?`
    ).run(amount, lineId);
  }
  if (GUARDED_TYPES.has(disputeType) && disputeType === "cross_night_refund") {
    db.prepare(
      `UPDATE settlement_lines SET cross_night_refund = ?, flags = flags || ',cross_night_disputed' WHERE id = ?`
    ).run(amount, lineId);
  }

  return db.prepare("SELECT * FROM disputes WHERE id = ?").get(id);
}

function resolveDispute(disputeId, resolution) {
  const db = getDb();
  const dispute = db.prepare("SELECT * FROM disputes WHERE id = ?").get(disputeId);
  if (!dispute) throw new Error("争议记录不存在");
  if (dispute.status !== "open") throw new Error("该争议已处理");

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE disputes SET status = ?, resolved_at = ? WHERE id = ?`
  ).run(resolution, now, disputeId);

  const line = db.prepare("SELECT * FROM settlement_lines WHERE id = ?").get(dispute.line_id);
  if (line) {
    const openForLine = db
      .prepare("SELECT COUNT(*) AS cnt FROM disputes WHERE line_id = ? AND status = 'open'")
      .get(dispute.line_id);
    if (openForLine.cnt === 0 && line.flags.includes("requires_dispute_review")) {
      const cleanedFlags = line.flags
        .split(",")
        .filter((f) => f !== "requires_dispute_review")
        .join(",");
      db.prepare("UPDATE settlement_lines SET flags = ? WHERE id = ?").run(cleanedFlags, dispute.line_id);
    }

    if (resolution === "resolved" && GUARDED_TYPES.has(dispute.dispute_type)) {
      const adjusted = Math.round((line.net_amount - dispute.amount) * 100) / 100;
      db.prepare(
        `UPDATE settlement_lines SET net_amount = ? WHERE id = ?`
      ).run(adjusted, dispute.line_id);

      const settlement = db.prepare("SELECT * FROM settlements WHERE id = ?").get(dispute.settlement_id);
      if (settlement) {
        const newNet = Math.round((settlement.total_net - dispute.amount) * 100) / 100;
        const newDed = Math.round((settlement.total_deduction + dispute.amount) * 100) / 100;
        db.prepare(
          `UPDATE settlements SET total_net = ?, total_deduction = ? WHERE id = ?`
        ).run(newNet, newDed, dispute.settlement_id);
      }
    }
  }

  return db.prepare("SELECT * FROM disputes WHERE id = ?").get(disputeId);
}

function exportSettlement(id) {
  const db = getDb();
  const s = getSettlement(id);
  if (!s) throw new Error("结算单不存在");

  const rows = [];
  rows.push(["结算单ID", s.id]);
  rows.push(["合同ID", s.contract_id]);
  rows.push(["周期", `${s.period_start} ~ ${s.period_end}`]);
  rows.push(["状态", s.status]);
  rows.push(["总毛额", s.total_gross]);
  rows.push(["总抵扣", s.total_deduction]);
  rows.push(["总净额", s.total_net]);
  rows.push([]);
  rows.push([
    "行ID", "订单ID", "毛额", "佣金", "保洁费",
    "押金扣留", "补贴追回", "跨夜退款", "净额", "标记"
  ]);

  for (const line of s.lines) {
    rows.push([
      line.id, line.order_id, line.gross_amount, line.commission,
      line.cleaning_fee, line.deposit_held, line.subsidy_recovery,
      line.cross_night_refund, line.net_amount, line.flags
    ]);
  }

  if (s.disputes && s.disputes.length > 0) {
    rows.push([]);
    rows.push(["争议ID", "类型", "金额", "原因", "影响行", "状态"]);
    for (const d of s.disputes) {
      rows.push([d.id, d.dispute_type, d.amount, d.reason, d.affected_lines, d.status]);
    }
  }

  return rows;
}

module.exports = {
  createSettlement,
  getSettlement,
  listSettlements,
  advanceStatus,
  addDispute,
  resolveDispute,
  exportSettlement,
  GUARDED_TYPES,
};
