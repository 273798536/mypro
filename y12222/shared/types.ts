export interface ExpenditureApplication {
  id: string
  title: string
  amount: number
  project_name: string
  applicant: string
  applicant_role: string
  status: 'draft' | 'pending_review' | 'reviewing' | 'approved' | 'rejected' | 'delayed'
  description: string
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  invoice_number: string
  amount: number
  vendor: string
  invoice_date: string
  expenditure_id: string
  is_duplicate: boolean
  duplicate_of: string | null
  duplicate_status: 'none' | 'suspected' | 'confirmed' | 'dismissed'
  verification_status: 'pending' | 'verified' | 'failed'
  created_at: string
}

export interface ApprovalRecord {
  id: string
  expenditure_id: string
  approver: string
  approver_role: string
  step_order: number
  status: 'pending' | 'approved' | 'rejected' | 'page_missing'
  comments: string
  page_number: string | null
  is_complete: boolean
  approved_at: string | null
  created_at: string
}

export interface ResidentOpinion {
  id: string
  expenditure_id: string
  resident_name: string
  opinion: string
  source_type: 'onsite' | 'written' | 'online'
  approval_id: string | null
  created_at: string
}

export interface ProjectDelay {
  id: string
  expenditure_id: string
  original_deadline: string
  new_deadline: string
  reason: string
  impact_description: string
  created_at: string
}

export interface DisclosureRecord {
  id: string
  expenditure_id: string
  disclosure_date: string
  end_date: string
  status: 'draft' | 'published' | 'ended'
  public_notice_content: string
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  entity_type: 'expenditure' | 'invoice' | 'approval' | 'opinion' | 'delay' | 'disclosure'
  entity_id: string
  action: 'create' | 'update' | 'status_change' | 'duplicate_confirm' | 'delay_record'
  old_value: string | null
  new_value: string
  operator: string
  impact_description: string
  created_at: string
}

export interface ExportReport {
  id: string
  title: string
  date_range_start: string
  date_range_end: string
  project_filter: string | null
  includes: {
    expenditures: boolean
    invoices: boolean
    duplicates: boolean
    approvals: boolean
    delays: boolean
    disclosures: boolean
  }
  created_at: string
}

export interface TraceChain {
  expenditure: ExpenditureApplication
  invoices: Invoice[]
  approvals: ApprovalRecord[]
  opinions: ResidentOpinion[]
  delays: ProjectDelay[]
  disclosures: DisclosureRecord[]
  audit_logs: AuditLog[]
  anomalies: {
    duplicates: Invoice[]
    missing_pages: ApprovalRecord[]
    delays: ProjectDelay[]
  }
}

export interface DashboardData {
  total_amount_this_month: number
  pending_approval_count: number
  anomaly_count: {
    duplicates: number
    missing_pages: number
    delays: number
  }
  publishing_count: number
  recent_changes: AuditLog[]
}

export interface DatabaseSchema {
  expenditures: ExpenditureApplication[]
  invoices: Invoice[]
  approvals: ApprovalRecord[]
  opinions: ResidentOpinion[]
  delays: ProjectDelay[]
  disclosures: DisclosureRecord[]
  audit_logs: AuditLog[]
  reports: ExportReport[]
}
