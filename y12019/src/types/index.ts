export type WorkOrderType = "routine" | "fault" | "fault_supplement"
export type ContractStatus = "active" | "terminated_early" | "completed"
export type ExceptionType = "missing_field" | "late_work_order" | "amount_mismatch" | "cross_year_pending"
export type ExceptionSeverity = "critical" | "warning" | "info"
export type ExceptionStatus = "pending" | "resolved" | "ignored"
export type ReversalType = "early_termination" | "version_change" | "correction"

export interface Equipment {
  id: string
  code: string
  name: string
  category: string
  remark: string
  status: "active" | "inactive"
}

export interface Contract {
  id: string
  code: string
  equipmentId: string
  version: string
  startDate: string
  endDate: string
  annualAmount: number | null
  monthlyAmount: number | null
  isCrossYear: boolean
  status: ContractStatus
}

export interface ContractVersionChange {
  id: string
  contractId: string
  version: string
  effectiveDate: string
  changes: Record<string, { old: unknown; new: unknown }>
  reason: string
}

export interface WorkOrder {
  id: string
  code: string
  contractId: string
  equipmentId: string
  type: WorkOrderType
  amount: number
  orderDate: string
  receivedDate: string
  isLateArrival: boolean
  status: "pending" | "settled"
}

export interface AccrualRecord {
  id: string
  contractId: string
  period: string
  amount: number
  calculationBasis: string
  version: string
  createdAt: string
}

export interface ReversalRecord {
  id: string
  contractId: string
  accrualId: string
  amount: number
  reason: string
  type: ReversalType
  reversalDate: string
  suggestions: Array<{ action: string; params: Record<string, unknown> }>
}

export interface Exception {
  id: string
  type: ExceptionType
  relatedId: string
  description: string
  severity: ExceptionSeverity
  status: ExceptionStatus
  suggestion: { action: string; description: string; params: Record<string, unknown> }
  createdAt: string
}

export interface CrossYearSettlement {
  id: string
  contractId: string
  fromPeriod: string
  toPeriod: string
  currentYearAmount: number
  nextYearAmount: number
  status: "pending" | "approved" | "confirmed"
  approvalInfo: { approver: string; date: string; note: string } | null
}

export interface ConsistencyCheckResult {
  passed: boolean
  checks: Array<{
    name: string
    passed: boolean
    expected: number
    actual: number
    detail: string
  }>
}

export interface Suggestion {
  action: string
  description: string
  params: Record<string, unknown>
}
