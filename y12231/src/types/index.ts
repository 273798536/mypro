export interface MemberAccount {
  id: string
  name: string
  phone: string
  balance: number
  status: 'active' | 'frozen' | 'closed'
  created_at: string
  updated_at: string
}

export interface PetProfile {
  id: string
  name: string
  species: string
  breed: string
  current_owner_id: string
  owner_name?: string
  created_at: string
}

export interface OwnershipChange {
  id: string
  pet_id: string
  previous_owner_id: string
  new_owner_id: string
  previous_owner_name?: string
  new_owner_name?: string
  pet_name?: string
  reason: string
  status: 'pending' | 'confirmed' | 'rejected'
  confirmed_by: string | null
  confirmed_at: string | null
  created_at: string
}

export interface Package {
  id: string
  name: string
  member_id: string
  member_name?: string
  total_deductions: number
  used_deductions: number
  remaining_deductions: number
  price: number
  expires_at: string
  status: 'active' | 'expired' | 'exhausted'
  created_at: string
}

export interface Transaction {
  id: string
  member_id: string
  member_name?: string
  pet_id: string | null
  pet_name?: string
  package_id: string | null
  package_name?: string
  amount: number
  type: 'consumption' | 'recharge' | 'refund'
  is_backfilled: boolean
  backfill_note: string | null
  backfilled_at: string | null
  affected_detail_ids: string[]
  created_at: string
}

export interface DeductionDetail {
  id: string
  transaction_id: string
  package_id: string
  package_name?: string
  deduction_count: number
  remaining_count: number
  status: 'normal' | 'duplicate' | 'expired' | 'manual_override'
  original_status: string | null
  manual_override_by: string | null
  manual_override_at: string | null
  manual_override_reason: string | null
  backfill_affected: boolean
  backfill_source_transaction_id: string | null
  created_at: string
}

export interface ExceptionItem {
  id: string
  type: 'ownership_change' | 'package_expired' | 'duplicate_deduction' | 'backfill_impact' | 'amount_anomaly'
  severity: 'warning' | 'critical'
  related_member_id: string | null
  related_member_name?: string
  related_pet_id: string | null
  related_pet_name?: string
  related_transaction_id: string | null
  description: string
  status: 'pending' | 'confirmed' | 'rejected' | 'resolved'
  resolved_by: string | null
  resolved_at: string | null
  resolution: string | null
  created_at: string
}

export interface OperationLog {
  id: string
  operator: string
  action: string
  target_type: string
  target_id: string
  old_value: string | null
  new_value: string | null
  note: string | null
  created_at: string
}

export interface DashboardData {
  totalBalance: number
  monthlyConsumption: number
  pendingCount: number
  exceptionCount: number
  packageStats: {
    byStatus: Array<{ status: string; count: number; total_price: number }>
    byMonth: Array<{ month: string; count: number; total_price: number }>
  }
  recentTransactions: Transaction[]
}

export interface RefundCalculation {
  memberId: string
  totalBalance: number
  consumableAmount: number
  deductionOverrides: Array<{
    detailId: string
    originalAmount: number
    overrideAmount: number
    difference: number
    overrideBy: string
    overrideAt: string
    reason: string
  }>
  overrideImpactTotal: number
  suggestedRefund: number
}

export interface FilterState {
  startDate: string
  endDate: string
  memberStatus: string
  packageStatus: string
  exceptionStatus: string
  searchQuery: string
}
