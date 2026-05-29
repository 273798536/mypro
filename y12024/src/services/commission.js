const { getDb } = require("../db");

function generateSheetNo(db) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const prefix = `CMS-${y}${m}${d}`;
  const row = db.prepare("SELECT COUNT(*) AS cnt FROM commission_sheets WHERE sheet_no LIKE ?").get(`${prefix}%`);
  return `${prefix}-${String(row.cnt + 1).padStart(3, "0")}`;
}

function calculateCommission(leaderId, periodStart, periodEnd) {
  const db = getDb();

  const leader = db.prepare("SELECT * FROM leaders WHERE id = ?").get(leaderId);
  if (!leader) throw new Error(`团长 ${leaderId} 不存在`);

  const orders = db.prepare(
    "SELECT * FROM orders WHERE leader_id = ? AND created_at >= ? AND created_at <= ?"
  ).all(leaderId, periodStart, periodEnd);

  const afterSales = db.prepare(
    `SELECT a.* FROM after_sales a
     JOIN orders o ON a.order_id = o.id
     WHERE a.leader_id = ? AND a.created_at >= ? AND a.created_at <= ?`
  ).all(leaderId, periodStart, periodEnd);

  let orderCommission = 0;
  const items = [];

  for (const order of orders) {
    let rate = leader.commission_rate;
    let category = "order_commission";
    let remark = `订单 ${order.order_no}: ${order.product_name} x${order.quantity}`;

    if (order.status === "reassigned") {
      category = "reassigned_order_commission";
      rate = leader.commission_rate * 0.5;
      remark += ` [缺货改配-待确认] 原${order.reassigned_from}, 原因:${order.reassigned_reason}`;
    }

    const amt = Math.round(order.total_amount * rate * 100) / 100;
    orderCommission += amt;

    items.push({
      source_type: "order",
      source_id: order.id,
      category,
      amount: amt,
      remark,
      _order: order,
    });
  }

  let afterSaleDeduct = 0;
  for (const as of afterSales) {
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(as.order_id);
    let rate = leader.commission_rate;
    let category = "after_sale_deduct";
    let remark = `售后 ${as.after_sale_no}: ${as.type}`;

    if (as.cross_group) {
      category = "cross_group_deduct";
      remark += ` [跨团售后-待核验] 下一步找: ${as.next_verifier}`;
    }

    const amt = Math.round(as.amount * rate * 100) / 100;
    afterSaleDeduct += amt;

    items.push({
      source_type: "after_sale",
      source_id: as.id,
      category,
      amount: -amt,
      remark,
      _afterSale: as,
    });
  }

  const subsidyAdjust = 0;
  const totalAmount = Math.round((orderCommission - afterSaleDeduct + subsidyAdjust) * 100) / 100;

  const hasReassigned = orders.some((o) => o.status === "reassigned");
  const hasCrossGroup = afterSales.some((a) => a.cross_group);
  let nextVerifier = null;
  if (hasReassigned || hasCrossGroup) {
    nextVerifier = "运营主管-赵经理";
  }

  return {
    leader,
    periodStart,
    periodEnd,
    orderCommission,
    afterSaleDeduct,
    subsidyAdjust,
    totalAmount,
    nextVerifier,
    items,
  };
}

function createSheet(leaderId, periodStart, periodEnd) {
  const db = getDb();
  const calc = calculateCommission(leaderId, periodStart, periodEnd);

  const sheetNo = generateSheetNo(db);

  const insertSheet = db.prepare(`
    INSERT INTO commission_sheets
      (sheet_no, leader_id, period_start, period_end, order_commission, after_sale_deduct, subsidy_adjust, total_amount, status, next_verifier)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = insertSheet.run(
    sheetNo,
    leaderId,
    periodStart,
    periodEnd,
    calc.orderCommission,
    calc.afterSaleDeduct,
    calc.subsidyAdjust,
    calc.totalAmount,
    "draft",
    calc.nextVerifier
  );

  const sheetId = info.lastInsertRowid;
  const insertItem = db.prepare(`
    INSERT INTO commission_items (sheet_id, source_type, source_id, category, amount, remark)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const item of calc.items) {
    insertItem.run(sheetId, item.source_type, item.source_id, item.category, item.amount, item.remark);
  }

  return { sheetId, sheetNo, ...calc };
}

function getSheetDetail(sheetId) {
  const db = getDb();

  const sheet = db.prepare("SELECT * FROM commission_sheets WHERE id = ?").get(sheetId);
  if (!sheet) throw new Error(`佣金单 ${sheetId} 不存在`);

  const leader = db.prepare("SELECT * FROM leaders WHERE id = ?").get(sheet.leader_id);
  const items = db.prepare("SELECT * FROM commission_items WHERE sheet_id = ? ORDER BY id").all(sheetId);
  const logs = db.prepare("SELECT * FROM audit_logs WHERE sheet_id = ? ORDER BY created_at").all(sheetId);

  const itemDetails = items.map((item) => {
    const detail = { ...item };
    if (item.source_type === "order") {
      detail.source = db.prepare("SELECT * FROM orders WHERE id = ?").get(item.source_id);
    } else if (item.source_type === "after_sale") {
      detail.source = db.prepare("SELECT * FROM after_sales WHERE id = ?").get(item.source_id);
    }
    return detail;
  });

  return { sheet, leader, items: itemDetails, auditLogs: logs };
}

function updateSheetStatus(sheetId, newStatus, operator, remark) {
  const db = getDb();

  const sheet = db.prepare("SELECT * FROM commission_sheets WHERE id = ?").get(sheetId);
  if (!sheet) throw new Error(`佣金单 ${sheetId} 不存在`);

  const oldStatus = sheet.status;

  const validTransitions = {
    draft: ["pending_confirm", "cancelled"],
    pending_confirm: ["confirmed", "draft"],
    confirmed: ["settled"],
    settled: [],
    cancelled: [],
  };

  const allowed = validTransitions[oldStatus] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`状态不允许从 ${oldStatus} 变更为 ${newStatus}，允许的目标状态: ${allowed.join(", ") || "无"}`);
  }

  db.prepare("UPDATE commission_sheets SET status = ?, updated_at = datetime('now') WHERE id = ?").run(newStatus, sheetId);

  db.prepare(
    "INSERT INTO audit_logs (sheet_id, field_name, old_value, new_value, operator) VALUES (?, ?, ?, ?, ?)"
  ).run(sheetId, "status", oldStatus, newStatus, operator || "system");

  if (remark) {
    db.prepare(
      "INSERT INTO audit_logs (sheet_id, field_name, old_value, new_value, operator) VALUES (?, ?, ?, ?, ?)"
    ).run(sheetId, "remark", null, remark, operator || "system");
  }

  return { sheetId, oldStatus, newStatus };
}

function listSheets({ leaderId, status, periodStart, periodEnd } = {}) {
  const db = getDb();
  let sql = `
    SELECT cs.*, l.name AS leader_name, l.community, l.leader_code
    FROM commission_sheets cs
    JOIN leaders l ON cs.leader_id = l.id
    WHERE 1=1
  `;
  const params = [];

  if (leaderId) { sql += " AND cs.leader_id = ?"; params.push(leaderId); }
  if (status) { sql += " AND cs.status = ?"; params.push(status); }
  if (periodStart) { sql += " AND cs.period_start >= ?"; params.push(periodStart); }
  if (periodEnd) { sql += " AND cs.period_end <= ?"; params.push(periodEnd); }

  sql += " ORDER BY cs.created_at DESC";

  return db.prepare(sql).all(...params);
}

function exportSheets({ leaderId, periodStart, periodEnd } = {}) {
  const db = getDb();
  let sql = `
    SELECT cs.*, l.name AS leader_name, l.community, l.leader_code, l.commission_rate
    FROM commission_sheets cs
    JOIN leaders l ON cs.leader_id = l.id
    WHERE 1=1
  `;
  const params = [];

  if (leaderId) { sql += " AND cs.leader_id = ?"; params.push(leaderId); }
  if (periodStart) { sql += " AND cs.period_start >= ?"; params.push(periodStart); }
  if (periodEnd) { sql += " AND cs.period_end <= ?"; params.push(periodEnd); }

  sql += " ORDER BY cs.leader_id, cs.period_start";

  const sheets = db.prepare(sql).all(...params);

  return sheets.map((s) => {
    const items = db.prepare("SELECT * FROM commission_items WHERE sheet_id = ? ORDER BY id").all(s.id);
    const logs = db.prepare("SELECT * FROM audit_logs WHERE sheet_id = ? ORDER BY created_at").all(s.id);
    return { ...s, items, auditLogs: logs };
  });
}

function importMaterials(materials) {
  const db = getDb();
  const results = { leaders: 0, orders: 0, afterSales: 0, errors: [] };

  const insertLeader = db.prepare(
    "INSERT OR IGNORE INTO leaders (leader_code, name, community, commission_rate) VALUES (?, ?, ?, ?)"
  );
  const insertOrder = db.prepare(
    "INSERT OR IGNORE INTO orders (order_no, leader_id, product_name, quantity, unit_price, total_amount, status, reassigned_from, reassigned_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const insertAfterSale = db.prepare(
    "INSERT OR IGNORE INTO after_sales (after_sale_no, order_id, leader_id, type, amount, cross_group, next_verifier, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );

  const findLeaderByCode = db.prepare("SELECT id FROM leaders WHERE leader_code = ?");
  const findOrderById = db.prepare("SELECT id FROM orders WHERE order_no = ?");

  const tx = db.transaction(() => {
    if (materials.leaders) {
      for (const l of materials.leaders) {
        try {
          insertLeader.run(l.leader_code, l.name, l.community, l.commission_rate || 0.10);
          results.leaders++;
        } catch (e) { results.errors.push({ type: "leader", data: l, error: e.message }); }
      }
    }

    if (materials.orders) {
      for (const o of materials.orders) {
        try {
          const leader = findLeaderByCode.get(o.leader_code);
          if (!leader) { results.errors.push({ type: "order", data: o, error: `团长 ${o.leader_code} 不存在` }); continue; }
          insertOrder.run(
            o.order_no, leader.id, o.product_name, o.quantity || 1,
            o.unit_price, o.total_amount, o.status || "normal",
            o.reassigned_from || null, o.reassigned_reason || null
          );
          results.orders++;
        } catch (e) { results.errors.push({ type: "order", data: o, error: e.message }); }
      }
    }

    if (materials.afterSales) {
      for (const a of materials.afterSales) {
        try {
          const leader = findLeaderByCode.get(a.leader_code);
          if (!leader) { results.errors.push({ type: "after_sale", data: a, error: `团长 ${a.leader_code} 不存在` }); continue; }
          const order = findOrderById.get(a.order_no);
          if (!order) { results.errors.push({ type: "after_sale", data: a, error: `订单 ${a.order_no} 不存在` }); continue; }
          insertAfterSale.run(
            a.after_sale_no, order.id, leader.id, a.type, a.amount,
            a.cross_group ? 1 : 0, a.next_verifier || null, a.status || "pending"
          );
          results.afterSales++;
        } catch (e) { results.errors.push({ type: "after_sale", data: a, error: e.message }); }
      }
    }
  });

  tx();
  return results;
}

function supplementSubsidy(sheetId, ruleName, amount, operator) {
  const db = getDb();

  const sheet = db.prepare("SELECT * FROM commission_sheets WHERE id = ?").get(sheetId);
  if (!sheet) throw new Error(`佣金单 ${sheetId} 不存在`);

  const oldSubsidy = sheet.subsidy_adjust;
  const newSubsidy = Math.round((oldSubsidy + amount) * 100) / 100;
  const oldTotal = sheet.total_amount;
  const newTotal = Math.round((sheet.order_commission - sheet.after_sale_deduct + newSubsidy) * 100) / 100;

  db.prepare("UPDATE commission_sheets SET subsidy_adjust = ?, total_amount = ?, updated_at = datetime('now') WHERE id = ?")
    .run(newSubsidy, newTotal, sheetId);

  db.prepare(
    "INSERT INTO commission_items (sheet_id, source_type, source_id, category, amount, remark) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(sheetId, "subsidy", 0, "subsidy_adjust", amount, `补贴补录: ${ruleName}`);

  db.prepare(
    "INSERT INTO audit_logs (sheet_id, field_name, old_value, new_value, operator) VALUES (?, ?, ?, ?, ?)"
  ).run(sheetId, "subsidy_adjust", String(oldSubsidy), String(newSubsidy), operator || "system");

  db.prepare(
    "INSERT INTO audit_logs (sheet_id, field_name, old_value, new_value, operator) VALUES (?, ?, ?, ?, ?)"
  ).run(sheetId, "total_amount", String(oldTotal), String(newTotal), operator || "system");

  return { sheetId, oldSubsidy, newSubsidy, oldTotal, newTotal };
}

module.exports = {
  calculateCommission,
  createSheet,
  getSheetDetail,
  updateSheetStatus,
  listSheets,
  exportSheets,
  importMaterials,
  supplementSubsidy,
};
