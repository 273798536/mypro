export interface Contract {
  id: string
  contract_no: string
  borrower_name: string
  borrower_id: string
  amount: number
  term: string
  start_date: string
  end_date: string
  rate: number
  status: string
  created_at: string
  created_by: string
}

export interface Guarantee {
  id: string
  contract_id: string
  guarantor_name: string
  guarantor_id: string
  guarantee_type: string
  guarantee_amount: number
  start_date: string
  end_date: string
  is_expired: number
  source_person: string
  created_at: string
}

export interface RepaymentRecord {
  id: string
  contract_id: string
  period: number
  due_date: string
  actual_date: string | null
  amount: number
  principal: number
  interest: number
  status: string
  is_extension_node: number
}

export interface ExtensionApplication {
  id: string
  contract_id: string
  extension_no: number
  original_end_date: string
  new_end_date: string
  extension_reason: string
  status: string
  created_at: string
  created_by: string
  submitted_at: string | null
}

export interface Material {
  id: string
  extension_id: string
  name: string
  type: string
  category: string
  source_person: string
  uploaded_at: string
}

export interface RiskFlag {
  id: string
  extension_id: string
  type: string
  severity: string
  description: string
  related_entity_id: string | null
  detected_at: string
}

export interface ApprovalRecord {
  id: string
  extension_id: string
  approver_name: string
  approver_role: string
  action: string
  opinion: string | null
  created_at: string
  is_immutable: number
}

export interface ContractDetail {
  contract: Contract
  guarantees: Guarantee[]
  repayment_records: RepaymentRecord[]
}

export interface ExtensionDetail {
  extension: ExtensionApplication
  materials: Material[]
}

export interface DetectedRisk {
  type: string
  severity: string
  description: string
  related_entity_id: string | null
}

export interface AuditEntry {
  extension_id: string
  extension_no: number
  contract_id: string
  approval: ApprovalRecord
  influences: ApprovalInfluence[]
}

export interface ApprovalInfluence {
  id: string
  approval_id: string
  influenced_by_approval_id: string
}

export interface InfluenceChain {
  approval: ApprovalRecord
  influenced_by: ApprovalRecord[]
  influences: ApprovalRecord[]
}

export interface ConsistencyCheckItem {
  extension_id: string
  extension_status: string
  latest_approval_action: string
  mismatch: boolean
}

export interface DashboardStats {
  pending_approvals: number
  pending_reviews: number
  risk_alerts: number
  recent_activities: AuditEntry[]
}
