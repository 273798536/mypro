export type CashFlowType = "receipt" | "payment"

export type DataSource = "collection_plan" | "payment_plan" | "fund_report"

export type RiskType = "date_misalignment" | "currency_unconverted" | "low_confidence"

export type RiskSeverity = "critical" | "warning" | "info"

export interface CashFlowItem {
  id: string
  type: CashFlowType
  department: string
  currency: string
  amount: number
  amountInBaseCurrency: number | null
  confidence: number
  dueDate: string
  source: DataSource
  sourceId: string
  isCurrencyConverted: boolean
  auditTrail: AuditEntry[]
}

export interface AuditEntry {
  id: string
  itemId: string
  timestamp: string
  field: string
  oldValue: string | number | null
  newValue: string | number | null
  reason: string
  operator: string
}

export interface RiskFlag {
  id: string
  type: RiskType
  itemId: string
  message: string
  severity: RiskSeverity
}

export interface Department {
  id: string
  name: string
  color: string
}

export interface CurrencyRate {
  from: string
  to: string
  rate: number
  updatedAt: string
}

export const SOURCE_LABELS: Record<DataSource, string> = {
  collection_plan: "收款计划",
  payment_plan: "付款计划",
  fund_report: "资金报告",
}

export const RISK_LABELS: Record<RiskType, string> = {
  date_misalignment: "日期错位",
  currency_unconverted: "币种未换算",
  low_confidence: "低置信度",
}

export const RISK_COLORS: Record<RiskType, string> = {
  date_misalignment: "#ef5350",
  currency_unconverted: "#ff9800",
  low_confidence: "#fdd835",
}
