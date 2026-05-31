export interface Supplier {
  id: string
  name: string
  qualification_status: string
  contact_person: string | null
  contact_phone: string | null
  address: string | null
  missing_fields: string[]
}

export interface Contract {
  id: string
  contract_no: string
  supplier_id: string
  supplier_name: string
  guarantee_no: string | null
  guarantee_amount: number | null
  guarantee_expiry_date: string | null
  guarantee_status: 'valid' | 'expiring_soon' | 'expired' | 'none'
  quota_used: number
  quota_total: number
  quota_manually_modified: boolean
  extend_count: number
  extend_blocked: boolean
  expired_warning_count?: number
  created_at: string
  days_left?: number | null
  warnings?: Warning[]
  quota_modifications?: QuotaModification[]
  histories?: History[]
}

export interface Warning {
  id: string
  contract_id: string
  contract_no: string
  supplier_id: string
  supplier_name: string
  guarantee_no: string
  guarantee_expiry_date: string
  guarantee_amount: number | null
  days_left: number | null
  level: 'expired' | 'urgent' | 'warning' | 'normal'
  status: 'pending' | 'confirmed'
  confirmed_by: string | null
  confirmed_at: string | null
  remark: string | null
  remark_modified_by: string | null
  remark_modified_at: string | null
  created_at: string
  quota_used?: number
  quota_total?: number
  quota_manually_modified?: boolean
  extend_count?: number
}

export interface History {
  id: string
  target_type: 'warning' | 'contract' | 'supplier'
  target_id: string
  action_type: 'confirm' | 'remark_modify' | 'extend' | 'extend_blocked' | 'quota_modify'
  operator: string
  before_value: string | null
  after_value: string | null
  detail: string
  created_at: string
}

export interface QuotaModification {
  id: string
  contract_id: string
  before_amount: number
  after_amount: number
  reason: string
  operator: string
  created_at: string
}

export interface SupplierDetail extends Supplier {
  contracts: Contract[]
  quota_modifications: QuotaModification[]
}
