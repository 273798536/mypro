import crypto from "crypto";
import { getDb } from "../db.js";
import type { Settlement } from "../../shared/types.js";

export function addDeduction(
  settlementId: string,
  data: { type: string; amount: number; description: string; sourceRef: string },
  operator: string
): void {
  const db = getDb();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  db.transaction(() => {
    const descriptionText =
      data.type === "repair"
        ? `维修费追扣: ${data.description}`
        : data.description;

    db.prepare(
      "INSERT INTO fee_deductions (id, settlement_id, type, amount, description, source_ref, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(id, settlementId, data.type, data.amount, descriptionText, data.sourceRef, now);

    const totalDeductions = (
      db
        .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM fee_deductions WHERE settlement_id = ?")
        .get(settlementId) as { total: number }
    ).total;

    const settlement = db
      .prepare("SELECT * FROM settlements WHERE id = ?")
      .get(settlementId) as Settlement;
    const netAmount =
      settlement.sale_price - settlement.commission_amount - totalDeductions;

    db.prepare(
      "UPDATE settlements SET total_deductions = ?, net_amount = ?, updated_at = ? WHERE id = ?"
    ).run(totalDeductions, netAmount, now, settlementId);

    db.prepare(
      "INSERT INTO audit_logs (id, entity_type, entity_id, action, details, operator, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(
      crypto.randomUUID(),
      "deduction",
      id,
      "deduct",
      `Added ${data.type} deduction: ${data.amount}`,
      operator,
      now
    );
  })();
}

export function removeDeduction(deductionId: string, operator: string): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.transaction(() => {
    const deduction = db
      .prepare("SELECT * FROM fee_deductions WHERE id = ?")
      .get(deductionId) as Record<string, unknown> | undefined;
    if (!deduction) throw new Error("Deduction not found");

    const settlementId = deduction.settlement_id as string;

    db.prepare("DELETE FROM fee_deductions WHERE id = ?").run(deductionId);

    const totalDeductions = (
      db
        .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM fee_deductions WHERE settlement_id = ?")
        .get(settlementId) as { total: number }
    ).total;

    const settlement = db
      .prepare("SELECT * FROM settlements WHERE id = ?")
      .get(settlementId) as Settlement;
    const netAmount =
      settlement.sale_price - settlement.commission_amount - totalDeductions;

    db.prepare(
      "UPDATE settlements SET total_deductions = ?, net_amount = ?, updated_at = ? WHERE id = ?"
    ).run(totalDeductions, netAmount, now, settlementId);

    db.prepare(
      "INSERT INTO audit_logs (id, entity_type, entity_id, action, details, operator, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(
      crypto.randomUUID(),
      "deduction",
      deductionId,
      "amend",
      `Removed ${deduction.type} deduction: ${deduction.amount}`,
      operator,
      now
    );
  })();
}
