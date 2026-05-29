export interface StoreRow {
  id: string;
  name: string;
  code: string;
  address: string | null;
  is_active: number;
  created_at: string;
}

export interface MemberCardRow {
  id: string;
  card_no: string;
  user_name: string;
  phone: string | null;
  principal_balance: number;
  bonus_balance: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface BonusRuleRow {
  id: string;
  version: number;
  name: string;
  tiers: string;
  priority: string;
  effective_from: string;
  effective_to: string | null;
  is_active: number;
  created_by: string;
  created_at: string;
}

export interface RechargeRecordRow {
  id: string;
  card_id: string;
  rule_id: string | null;
  principal_amount: number;
  bonus_amount: number;
  total_amount: number;
  operator: string;
  source: string | null;
  remark: string | null;
  created_at: string;
}

export interface BalanceLedgerRow {
  id: string;
  card_id: string;
  type: string;
  amount: number;
  principal_amount: number;
  bonus_amount: number;
  balance_after: number;
  principal_after: number;
  bonus_after: number;
  source: string;
  source_id: string;
  operator: string;
  remark: string | null;
  is_exception: number;
  exception_type: string | null;
  created_at: string;
}

export interface ConsumptionRow {
  id: string;
  card_id: string;
  store_id: string;
  store_name: string;
  amount: number;
  principal_used: number;
  bonus_used: number;
  is_cross_store: number;
  is_reversed: number;
  reversed_at: string | null;
  reverse_reason: string | null;
  operator: string;
  created_at: string;
}

export interface RefundRequestRow {
  id: string;
  card_id: string;
  principal_balance: number;
  bonus_balance: number;
  refund_amount: number;
  status: string;
  applicant: string;
  approver: string | null;
  approved_at: string | null;
  reject_reason: string | null;
  created_at: string;
}

export interface AuditLogRow {
  id: string;
  action: string;
  module: string;
  operator: string;
  details: string | null;
  created_at: string;
}

export interface BalanceSnapshotRow {
  id: string;
  snapshot_date: string;
  card_id: string;
  principal_balance: number;
  bonus_balance: number;
  total_balance: number;
  created_at: string;
}

export interface LedgerWithCard extends BalanceLedgerRow {
  card_no: string | null;
  user_name: string | null;
}

export interface ConsumptionWithCard extends ConsumptionRow {
  card_no: string | null;
  user_name: string | null;
}

export interface RechargeWithCard extends RechargeRecordRow {
  card_no: string | null;
  user_name: string | null;
}

export interface RefundWithCard extends RefundRequestRow {
  card_no: string | null;
  user_name: string | null;
  phone: string | null;
}

export interface SnapshotWithCard extends BalanceSnapshotRow {
  card_no: string | null;
  user_name: string | null;
}

export interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  role: string;
  display_name: string;
  store_id: string | null;
  is_active: number;
  created_at: string;
}
