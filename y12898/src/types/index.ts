export interface TidalRecord {
  id: string
  timestamp: string
  tideLevel: number | null
  timezone: string
  remark: string
  source: "manual" | "import" | "supplement"
  importBatchId?: string
}

export type IssueType = "null_value" | "duplicate" | "timezone_error" | "mixed_remark"
export type IssueSeverity = "critical" | "warning" | "info"
export type IssueStatus = "pending" | "confirmed" | "resolved"

export interface QualityIssue {
  id: string
  type: IssueType
  recordId: string
  description: string
  severity: IssueSeverity
  status: IssueStatus
}

export interface CorrectionRecord {
  id: string
  recordId: string
  field: string
  oldValue: string | number | null
  newValue: string | number | null
  reason: string
  operator: string
  timestamp: string
  reviewStatus: "pending" | "approved"
}

export interface ReviewNote {
  id: string
  content: string
  relatedIssueIds: string[]
  status: "pending" | "approved"
  createdAt: string
  approvedAt?: string
}

export interface RiskNotice {
  id: string
  title: string
  level: "red" | "orange" | "yellow"
  description: string
  relatedRecordIds: string[]
  timestamp: string
}

export interface WaterQualityRecord {
  id: string
  timestamp: string
  dissolvedOxygen: number | null
  salinity: number | null
  temperature: number | null
  remark: string
}

export interface DuplicateReport {
  id: string
  originalRecordId: string
  duplicateRecordId: string
  field: string
  originalValue: string | number | null
  duplicateValue: string | number | null
  status: "pending" | "merged" | "discarded"
}

export type ConsistencyStatus = "pass" | "warning" | "inconsistent"

export interface ConsistencyCheck {
  status: ConsistencyStatus
  details: string[]
}

export type ViewMode = "full" | "fleet"
