import crypto from "crypto";
import { getDb } from "../db.js";
import type { Settlement, SettlementDetail, TrailItem } from "../../shared/types.js";

export function listSettlements(filters: {
  status?: string;
  seller?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.status) {
    conditions.push("s.status = ?");
    params.push(filters.status);
  }
  if (filters.seller) {
    conditions.push("c.seller_name LIKE ?");
    params.push(`%${filters.seller}%`);
  }
  if (filters.dateFrom) {
    conditions.push("s.created_at >= ?");
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push("s.created_at <= ?");
    params.push(filters.dateTo);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `
    SELECT s.*, c.consignment_no, c.seller_name, c.item_name, o.sale_no
    FROM settlements s
    JOIN consignments c ON s.consignment_id = c.id
    JOIN sale_orders o ON s.sale_order_id = o.id
    ${where}
    ORDER BY s.created_at DESC
  `;

  return db.prepare(sql).all(...params);
}

export function getSettlementDetail(id: string): SettlementDetail | null {
  const db = getDb();

  const settlement = db
    .prepare("SELECT * FROM settlements WHERE id = ?")
    .get(id) as Settlement | undefined;
  if (!settlement) return null;

  const consignment = db
    .prepare("SELECT * FROM consignments WHERE id = ?")
    .get(settlement.consignment_id);
  const appraisalRecords = db
    .prepare("SELECT * FROM appraisal_records WHERE consignment_id = ? ORDER BY created_at")
    .all(settlement.consignment_id);
  const saleOrder = db
    .prepare("SELECT * FROM sale_orders WHERE id = ?")
    .get(settlement.sale_order_id);
  const commissionRule = settlement.commission_rule_id
    ? db.prepare("SELECT * FROM commission_rules WHERE id = ?").get(settlement.commission_rule_id)
    : null;
  const deductions = db
    .prepare("SELECT * FROM fee_deductions WHERE settlement_id = ? ORDER BY created_at")
    .all(id);
  const amendments = db
    .prepare("SELECT * FROM settlement_amendments WHERE settlement_id = ? ORDER BY created_at")
    .all(id);
  const auditLogs = db
    .prepare("SELECT * FROM audit_logs WHERE entity_type = 'settlement' AND entity_id = ? ORDER BY created_at")
    .all(id);

  return {
    settlement,
    consignment: consignment as SettlementDetail["consignment"],
    appraisalRecords: appraisalRecords as SettlementDetail["appraisalRecords"],
    saleOrder: saleOrder as SettlementDetail["saleOrder"],
    commissionRule: commissionRule as SettlementDetail["commissionRule"],
    deductions: deductions as SettlementDetail["deductions"],
    amendments: amendments as SettlementDetail["amendments"],
    auditLogs: auditLogs as SettlementDetail["auditLogs"],
  };
}

export function confirmSettlement(id: string, operator: string): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.transaction(() => {
    db.prepare(
      "UPDATE settlements SET status = 'confirmed', updated_at = ? WHERE id = ?"
    ).run(now, id);

    db.prepare(
      "INSERT INTO audit_logs (id, entity_type, entity_id, action, details, operator, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(
      crypto.randomUUID(),
      "settlement",
      id,
      "confirm",
      `Settlement ${id} confirmed`,
      operator,
      now
    );
  })();
}

export function cancelSettlement(
  id: string,
  reason: string,
  operator: string
): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.transaction(() => {
    const settlement = db
      .prepare("SELECT * FROM settlements WHERE id = ?")
      .get(id) as Settlement | undefined;
    if (!settlement) throw new Error("Settlement not found");

    db.prepare(
      "UPDATE settlements SET status = 'cancelled', updated_at = ? WHERE id = ?"
    ).run(now, id);

    db.prepare(
      "UPDATE sale_orders SET status = 'cancelled', cancelled_at = ?, cancel_reason = ?, updated_at = ? WHERE id = ?"
    ).run(now, reason, now, settlement.sale_order_id);

    db.prepare(
      "INSERT INTO audit_logs (id, entity_type, entity_id, action, details, operator, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(
      crypto.randomUUID(),
      "settlement",
      id,
      "cancel",
      `Settlement ${id} cancelled: ${reason}`,
      operator,
      now
    );

    db.prepare(
      "INSERT INTO audit_logs (id, entity_type, entity_id, action, details, operator, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(
      crypto.randomUUID(),
      "sale_order",
      settlement.sale_order_id,
      "cancel",
      `Sale order cancelled due to settlement ${id} cancellation: ${reason}`,
      operator,
      now
    );
  })();
}

export function getSettlementTrail(id: string): TrailItem[] {
  const db = getDb();
  const trail: TrailItem[] = [];

  const settlement = db
    .prepare("SELECT * FROM settlements WHERE id = ?")
    .get(id) as Settlement | undefined;
  if (!settlement) return trail;

  const consignment = db
    .prepare("SELECT * FROM consignments WHERE id = ?")
    .get(settlement.consignment_id) as Record<string, unknown> | undefined;
  if (consignment) {
    trail.push({
      type: "consignment",
      id: consignment.id as string,
      ref_no: consignment.consignment_no as string,
      description: `${consignment.seller_name} - ${consignment.item_name}`,
      timestamp: consignment.created_at as string,
    });
  }

  const appraisals = db
    .prepare("SELECT * FROM appraisal_records WHERE consignment_id = ? ORDER BY created_at")
    .all(settlement.consignment_id) as Record<string, unknown>[];
  for (const a of appraisals) {
    trail.push({
      type: "appraisal",
      id: a.id as string,
      ref_no: a.id as string,
      description: `Appraisal by ${a.appraiser}: ${a.result}`,
      timestamp: a.created_at as string,
    });
  }

  const saleOrder = db
    .prepare("SELECT * FROM sale_orders WHERE id = ?")
    .get(settlement.sale_order_id) as Record<string, unknown> | undefined;
  if (saleOrder) {
    trail.push({
      type: "sale_order",
      id: saleOrder.id as string,
      ref_no: saleOrder.sale_no as string,
      description: `Sale price: ${saleOrder.sale_price}`,
      timestamp: saleOrder.created_at as string,
    });
  }

  trail.push({
    type: "settlement",
    id: settlement.id,
    ref_no: settlement.id,
    description: `Net: ${settlement.net_amount} (${settlement.status})`,
    timestamp: settlement.created_at,
  });

  const deductions = db
    .prepare("SELECT * FROM fee_deductions WHERE settlement_id = ? ORDER BY created_at")
    .all(id) as Record<string, unknown>[];
  for (const d of deductions) {
    trail.push({
      type: "deduction",
      id: d.id as string,
      ref_no: d.id as string,
      description: `${d.type}: ${d.amount} - ${d.description}`,
      timestamp: d.created_at as string,
    });
  }

  const amendments = db
    .prepare("SELECT * FROM settlement_amendments WHERE settlement_id = ? ORDER BY created_at")
    .all(id) as Record<string, unknown>[];
  for (const a of amendments) {
    trail.push({
      type: "amendment",
      id: a.id as string,
      ref_no: a.id as string,
      description: `${a.field}: ${a.old_value} → ${a.new_value}`,
      timestamp: a.created_at as string,
    });
  }

  return trail;
}
