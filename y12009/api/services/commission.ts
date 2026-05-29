import crypto from "crypto";
import { getDb } from "../db.js";
import type { CommissionRule, Settlement } from "../../shared/types.js";

export function listRules(): CommissionRule[] {
  const db = getDb();
  return db.prepare("SELECT * FROM commission_rules ORDER BY min_price").all() as CommissionRule[];
}

export function calculateCommission(salePrice: number): {
  ruleId: string;
  rate: number;
  commissionAmount: number;
  fixedFee: number;
} {
  const db = getDb();
  const rule = db
    .prepare(
      "SELECT * FROM commission_rules WHERE min_price <= ? AND max_price > ? ORDER BY min_price DESC LIMIT 1"
    )
    .get(salePrice, salePrice) as CommissionRule | undefined;

  if (!rule) {
    return { ruleId: "", rate: 0, commissionAmount: 0, fixedFee: 0 };
  }

  const commissionAmount = salePrice * rule.rate + rule.fixed_fee;

  return {
    ruleId: rule.id,
    rate: rule.rate,
    commissionAmount,
    fixedFee: rule.fixed_fee,
  };
}

export function recalculateSettlement(
  settlementId: string,
  newRate?: number
): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.transaction(() => {
    const settlement = db
      .prepare("SELECT * FROM settlements WHERE id = ?")
      .get(settlementId) as Settlement | undefined;
    if (!settlement) throw new Error("Settlement not found");

    let commissionAmount: number;
    let commissionRate: number;
    let commissionRuleId: string | null;

    if (newRate !== undefined) {
      commissionRate = newRate;
      commissionAmount = settlement.sale_price * newRate;
      commissionRuleId = null;
    } else {
      const calc = calculateCommission(settlement.sale_price);
      commissionRate = calc.rate;
      commissionAmount = calc.commissionAmount;
      commissionRuleId = calc.ruleId || null;
    }

    const netAmount =
      settlement.sale_price - commissionAmount - settlement.total_deductions;

    db.prepare(
      "UPDATE settlements SET commission_rate = ?, commission_amount = ?, commission_rule_id = ?, net_amount = ?, status = 'amended', updated_at = ? WHERE id = ?"
    ).run(commissionRate, commissionAmount, commissionRuleId, netAmount, now, settlementId);

    db.prepare(
      "INSERT INTO audit_logs (id, entity_type, entity_id, action, details, operator, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(
      crypto.randomUUID(),
      "settlement",
      settlementId,
      "amend",
      `Commission recalculated: rate=${commissionRate}, amount=${commissionAmount}, net=${netAmount}`,
      "system",
      now
    );
  })();
}
