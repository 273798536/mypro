export type FlowUnit = "m3/h" | "L/s" | "gpm"
export type HeadUnit = "m" | "ft" | "kPa"
export type PowerUnit = "kW" | "hp"
export type RecordStatus = "draft" | "reviewed" | "approved" | "archived"
export type WarningCode = "UNIT_MIX" | "SPEED_OUT_OF_RANGE" | "MISSING_CONDITION"
export type WarningSeverity = "error" | "warning" | "info"

export interface CalculateRequest {
  ratedFlow: number
  ratedFlowUnit: FlowUnit
  ratedHead: number
  ratedHeadUnit: HeadUnit
  ratedPower: number
  ratedPowerUnit: PowerUnit
  ratedSpeed: number
  targetSpeed: number
  speedUnit: "rpm"
  source: string
  remark?: string
}

export interface CalculationResult {
  targetFlow: number
  targetFlowUnit: FlowUnit
  targetHead: number
  targetHeadUnit: HeadUnit
  targetPower: number
  targetPowerUnit: PowerUnit
  flowRatio: number
  headRatio: number
  powerRatio: number
  efficiencyEstimate: number
}

export interface Warning {
  code: WarningCode
  message: string
  affectedFields: string[]
  severity: WarningSeverity
}

export interface CalculateResponse {
  id: string
  results: CalculationResult
  warnings: Warning[]
  version: number
  createdAt: string
}

export interface StatusChange {
  id: string
  recordId: string
  fromStatus: string
  toStatus: string
  operator: string
  comment?: string
  createdAt: string
}

export interface CalculationRecord {
  id: string
  ratedFlow: number
  ratedFlowUnit: FlowUnit
  ratedHead: number
  ratedHeadUnit: HeadUnit
  ratedPower: number
  ratedPowerUnit: PowerUnit
  ratedSpeed: number
  targetSpeed: number
  speedUnit: "rpm"
  targetFlow: number | null
  targetHead: number | null
  targetPower: number | null
  flowRatio: number | null
  headRatio: number | null
  powerRatio: number | null
  efficiencyEstimate: number | null
  source: string
  version: number
  status: RecordStatus
  remark: string | null
  createdAt: string
  updatedAt: string
  warnings: Warning[]
  statusHistory: StatusChange[]
}

export interface SchemeComparison {
  id: string
  recordIds: string[]
  comparisonName: string
  resultSummary: string | null
  createdAt: string
}

export interface RecordFilter {
  status?: RecordStatus
  source?: string
  keyword?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}
