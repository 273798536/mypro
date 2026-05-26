export interface Store {
  id: string;
  name: string;
  code: string;
  address: string;
  is_active: number;
  created_at: string;
}

export interface MemberCard {
  id: string;
  card_no: string;
  user_name: string;
  phone: string;
  principal_balance: number;
  bonus_balance: number;
  status: 'active' | 'frozen' | 'refunded';
  created_at: string;
  updated_at: string;
}

export interface BalanceLedger {
  id: string;
  card_id: string;
  type: 'recharge' | 'consume' | 'refund' | 'bonus' | 'adjust' | 'reverse';
  amount: number;
  principal_amount: number;
  bonus_amount: number;
  balance_after: number;
  principal_after: number;
  bonus_after: number;
  source: string;
  source_id: string;
  operator: string;
  remark: string;
  is_exception: number;
  exception_type?: string;
  created_at: string;
  card_no?: string;
  user_name?: string;
}

export interface RechargeRecord {
  id: string;
  card_id: string;
  rule_id?: string;
  principal_amount: number;
  bonus_amount: number;
  total_amount: number;
  operator: string;
  source?: string;
  remark?: string;
  created_at: string;
  card_no?: string;
  user_name?: string;
}

export interface Consumption {
  id: string;
  card_id: string;
  store_id: string;
  store_name: string;
  amount: number;
  principal_used: number;
  bonus_used: number;
  is_cross_store: number;
  is_reversed: number;
  reversed_at?: string;
  reverse_reason?: string;
  operator: string;
  created_at: string;
  card_no?: string;
  user_name?: string;
}

export interface RefundRequest {
  id: string;
  card_id: string;
  principal_balance: number;
  bonus_balance: number;
  refund_amount: number;
  status: 'pending' | 'approved' | 'rejected';
  applicant: string;
  approver?: string;
  approved_at?: string;
  reject_reason?: string;
  created_at: string;
  card_no?: string;
  user_name?: string;
  phone?: string;
}

export interface BonusRule {
  id: string;
  version: number;
  name: string;
  tiers: Array<{ minAmount: number; bonusRate: number; maxBonus?: number }>;
  priority: 'bonus_first' | 'principal_first';
  effective_from: string;
  effective_to?: string;
  is_active: number;
  created_by: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  action: string;
  module: string;
  operator: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface DashboardSummary {
  totalCards: number;
  totalPrincipal: number;
  totalBonus: number;
  totalBalance: number;
  exceptionCount: number;
  monthRecharge: number;
  monthConsume: number;
}

export interface TrendData {
  date: string;
  recharge: number;
  consume: number;
}

export interface StoreStats {
  store_id: string;
  store_name: string;
  transaction_count: number;
  total_amount: number;
  cross_store_count: number;
}
