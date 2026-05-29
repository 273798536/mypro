export interface Consignment {
  id: string;
  consignment_no: string;
  seller_name: string;
  seller_contact: string;
  item_name: string;
  item_brand: string;
  item_category: string;
  item_condition: string;
  listed_price: number;
  status: "pending" | "appraising" | "appraised" | "listed" | "sold" | "returned" | "cancelled";
  created_at: string;
  updated_at: string;
}

export interface AppraisalRecord {
  id: string;
  consignment_id: string;
  appraisal_date: string;
  result: "passed" | "returned";
  notes: string;
  appraiser: string;
  created_at: string;
}

export interface SaleOrder {
  id: string;
  sale_no: string;
  consignment_id: string;
  sale_price: number;
  sale_date: string;
  status: "active" | "cancelled";
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommissionRule {
  id: string;
  name: string;
  min_price: number;
  max_price: number;
  rate: number;
  fixed_fee: number;
  created_at: string;
}

export interface FeeDeduction {
  id: string;
  settlement_id: string;
  type: "repair" | "appraisal" | "storage" | "other";
  amount: number;
  description: string;
  source_ref: string;
  created_at: string;
}

export interface Settlement {
  id: string;
  consignment_id: string;
  sale_order_id: string;
  sale_price: number;
  commission_rule_id: string | null;
  commission_rate: number;
  commission_amount: number;
  total_deductions: number;
  net_amount: number;
  status: "pending" | "confirmed" | "amended" | "cancelled";
  created_at: string;
  updated_at: string;
}

export interface SettlementAmendment {
  id: string;
  settlement_id: string;
  field: string;
  old_value: string;
  new_value: string;
  reason: string;
  operator: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  entity_type: "settlement" | "consignment" | "sale_order" | "deduction";
  entity_id: string;
  action: "create" | "amend" | "cancel" | "deduct" | "confirm";
  details: string;
  operator: string;
  created_at: string;
}

export interface SettlementDetail {
  settlement: Settlement;
  consignment: Consignment;
  appraisalRecords: AppraisalRecord[];
  saleOrder: SaleOrder;
  commissionRule: CommissionRule | null;
  deductions: FeeDeduction[];
  amendments: SettlementAmendment[];
  auditLogs: AuditLog[];
}

export interface TrailItem {
  type: "consignment" | "appraisal" | "sale_order" | "settlement" | "deduction" | "amendment";
  id: string;
  ref_no: string;
  description: string;
  timestamp: string;
}
