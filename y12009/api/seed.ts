import crypto from "crypto";
import { getDb } from "./db.js";

export function seedData(): void {
  const db = getDb();

  const count = (db.prepare("SELECT COUNT(*) as c FROM consignments").get() as { c: number }).c;
  if (count > 0) return;

  db.transaction(() => {
    const now = new Date().toISOString();
    const past = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d.toISOString();
    };

    const insertConsignment = db.prepare(
      "INSERT INTO consignments (id, consignment_no, seller_name, seller_contact, item_name, item_brand, item_category, item_condition, listed_price, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const insertAppraisal = db.prepare(
      "INSERT INTO appraisal_records (id, consignment_id, appraisal_date, result, notes, appraiser, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    const insertSale = db.prepare(
      "INSERT INTO sale_orders (id, sale_no, consignment_id, sale_price, sale_date, status, cancelled_at, cancel_reason, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const insertSettlement = db.prepare(
      "INSERT INTO settlements (id, consignment_id, sale_order_id, sale_price, commission_rule_id, commission_rate, commission_amount, total_deductions, net_amount, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const insertDeduction = db.prepare(
      "INSERT INTO fee_deductions (id, settlement_id, type, amount, description, source_ref, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    const insertAudit = db.prepare(
      "INSERT INTO audit_logs (id, entity_type, entity_id, action, details, operator, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );

    const c1 = crypto.randomUUID();
    insertConsignment.run(c1, "CS-2026-001", "王丽华", "138****1234", "Chanel Classic Flap 中号", "Chanel", "包袋", "9成新", 68000, "sold", past(30), past(28));
    insertAppraisal.run(crypto.randomUUID(), c1, past(28), "passed", "正品，五金轻微划痕", "张鉴定师", past(28));
    const s1 = crypto.randomUUID();
    insertSale.run(s1, "SO-2026-001", c1, 65000, past(20), "active", null, null, past(20), past(20));
    const st1 = crypto.randomUUID();
    const comm1 = 65000 * 0.10 + 500;
    const ded1 = 800;
    insertSettlement.run(st1, c1, s1, 65000, "cr-003", 0.10, comm1, ded1, 65000 - comm1 - ded1, "confirmed", past(18), past(15));
    const d1 = crypto.randomUUID();
    insertDeduction.run(d1, st1, "repair", 800, "维修费追扣: 五金抛光修复", "WO-2026-001", past(16));
    insertAudit.run(crypto.randomUUID(), "settlement", st1, "create", "Settlement created for CS-2026-001", "system", past(18));
    insertAudit.run(crypto.randomUUID(), "deduction", d1, "deduct", "Added repair deduction: 800", "system", past(16));
    insertAudit.run(crypto.randomUUID(), "settlement", st1, "confirm", "Settlement confirmed", "财务张", past(15));

    const c2 = crypto.randomUUID();
    insertConsignment.run(c2, "CS-2026-002", "李明", "139****5678", "Hermès Birkin 30 Togo", "Hermès", "包袋", "8成新", 120000, "sold", past(25), past(22));
    insertAppraisal.run(crypto.randomUUID(), c2, past(22), "passed", "正品，皮质有使用痕迹", "张鉴定师", past(22));
    const s2 = crypto.randomUUID();
    insertSale.run(s2, "SO-2026-002", c2, 115000, past(15), "active", null, null, past(15), past(15));
    const st2 = crypto.randomUUID();
    const comm2 = 115000 * 0.10 + 500;
    insertSettlement.run(st2, c2, s2, 115000, "cr-003", 0.10, comm2, 0, 115000 - comm2, "pending", past(12), past(12));
    insertAudit.run(crypto.randomUUID(), "settlement", st2, "create", "Settlement created for CS-2026-002", "system", past(12));

    const c3 = crypto.randomUUID();
    insertConsignment.run(c3, "CS-2026-003", "赵芳", "137****9012", "Louis Vuitton Neverfull MM", "Louis Vuitton", "包袋", "7成新", 8500, "sold", past(20), past(18));
    insertAppraisal.run(crypto.randomUUID(), c3, past(18), "returned", "仿品，鉴定未通过", "李鉴定师", past(18));
    insertAppraisal.run(crypto.randomUUID(), c3, past(17), "passed", "二次鉴定通过，正品", "张鉴定师", past(17));
    const s3 = crypto.randomUUID();
    insertSale.run(s3, "SO-2026-003", c3, 7200, past(10), "active", null, null, past(10), past(10));
    const st3 = crypto.randomUUID();
    const comm3 = 7200 * 0.15;
    const ded3 = 500;
    insertSettlement.run(st3, c3, s3, 7200, "cr-001", 0.15, comm3, ded3, 7200 - comm3 - ded3, "amended", past(8), past(5));
    const d3 = crypto.randomUUID();
    insertDeduction.run(d3, st3, "appraisal", 500, "鉴定费（含二次鉴定）", "AP-2026-003", past(7));
    insertAudit.run(crypto.randomUUID(), "settlement", st3, "create", "Settlement created for CS-2026-003", "system", past(8));
    insertAudit.run(crypto.randomUUID(), "deduction", d3, "deduct", "Added appraisal deduction: 500", "system", past(7));
    insertAudit.run(crypto.randomUUID(), "settlement", st3, "amend", "Settlement amended", "财务张", past(5));

    const c4 = crypto.randomUUID();
    insertConsignment.run(c4, "CS-2026-004", "陈伟", "136****3456", "Rolex Submariner Date", "Rolex", "腕表", "9.5成新", 95000, "sold", past(22), past(20));
    insertAppraisal.run(crypto.randomUUID(), c4, past(20), "passed", "正品，全套齐全", "李鉴定师", past(20));
    const s4 = crypto.randomUUID();
    insertSale.run(s4, "SO-2026-004", c4, 92000, past(14), "cancelled", past(10), "买家退货", past(14), past(10));
    const st4 = crypto.randomUUID();
    const comm4 = 92000 * 0.10 + 500;
    insertSettlement.run(st4, c4, s4, 92000, "cr-003", 0.10, comm4, 0, 92000 - comm4, "cancelled", past(12), past(10));
    insertAudit.run(crypto.randomUUID(), "settlement", st4, "create", "Settlement created for CS-2026-004", "system", past(12));
    insertAudit.run(crypto.randomUUID(), "settlement", st4, "cancel", "Settlement cancelled: 买家退货", "财务张", past(10));
    insertAudit.run(crypto.randomUUID(), "sale_order", s4, "cancel", "Sale order cancelled due to settlement cancellation: 买家退货", "财务张", past(10));

    const c5 = crypto.randomUUID();
    insertConsignment.run(c5, "CS-2026-005", "孙静", "135****7890", "Gucci Marmont 迷你包", "Gucci", "包袋", "全新", 15000, "appraising", past(5), past(5));

    const c6 = crypto.randomUUID();
    insertConsignment.run(c6, "CS-2026-006", "周磊", "133****2345", "Dior Saddle 马鞍包", "Dior", "包袋", "8.5成新", 28000, "returned", past(15), past(13));
    insertAppraisal.run(crypto.randomUUID(), c6, past(13), "returned", "严重磨损，不符寄售标准", "张鉴定师", past(13));
  })();
}
