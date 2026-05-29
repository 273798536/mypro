import crypto from "crypto";
import { getDb } from "../db.js";
import type { Settlement, SettlementAmendment } from "../../shared/types.js";

const FINANCIAL_FIELDS = new Set([
  "sale_price",
  "commission_rate",
  "commission_amount",
  "total_deductions",
]);

const SETTLEMENT_FIELDS = new Set([
  "consignment_id",
  "sale_order_id",
  "sale_price",
  "commission_rule_id",
  "commission_rate",
  "commission_amount",
  "total_deductions",
  "net_amount",
  "status",
]);

export function createAmendment(
  settlementId: string,
  data: { field: string; newValue: string; reason: string },
  operator: string
): void {
  const db = getDb();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  db.transaction(() => {
    const settlement = db
      .prepare("SELECT * FROM settlements WHERE id = ?")
      .get(settlementId) as Settlement | undefined;
    if (!settlement) throw new Error("Settlement not found");

    if (!SETTLEMENT_FIELDS.has(data.field)) {
      throw new Error(`Invalid field: ${data.field}`);
    }

    const oldValue = String((settlement as unknown as Record<string, unknown>)[data.field]);

    db.prepare(
      "INSERT INTO settlement_amendments (id, settlement_id, field, old_value, new_value, reason, operator, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(id, settlementId, data.field, oldValue, data.newValue, data.reason, operator, now);

    const numericValue = Number(data.newValue);
    const valueToSet = isNaN(numericValue) ? data.newValue : numericValue;

    db.prepare(
      `UPDATE settlements SET ${data.field} = ?, updated_at = ? WHERE id = ?`
    ).run(valueToSet, now, settlementId);

    if (FINANCIAL_FIELDS.has(data.field)) {
      const updated = db
        .prepare("SELECT * FROM settlements WHERE id = ?")
        .get(settlementId) as Settlement;
      const netAmount =
        updated.sale_price - updated.commission_amount - updated.total_deductions;
      db.prepare(
        "UPDATE settlements SET net_amount = ?, status = 'amended', updated_at = ? WHERE id = ?"
      ).run(netAmount, now, settlementId);
    } else {
      db.prepare(
        "UPDATE settlements SET status = 'amended', updated_at = ? WHERE id = ?"
      ).run(now, settlementId);
    }

    db.prepare(
      "INSERT INTO audit_logs (id, entity_type, entity_id, action, details, operator, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(
      crypto.randomUUID(),
      "settlement",
      settlementId,
      "amend",
      `Amended ${data.field}: ${oldValue} → ${data.newValue}`,
      operator,
      now
    );
  })();
}

export function listAmendments(settlementId: string): SettlementAmendment[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM settlement_amendments WHERE settlement_id = ? ORDER BY created_at"
    )
    .all(settlementId) as SettlementAmendment[];
}
