export interface StandardSignal {
  id: string
  name: string
  frequency: number
  amplitude: number
  source: string
  validFrom: string
  validTo: string
  isExpired: boolean
}

export interface DeviceRecord {
  id: string
  deviceNumber: string
  isBackfilled: boolean
  backfilledAt: string | null
  backfillAffectedDetailIds: string[]
}

export interface ReadingRecord {
  id: string
  standardSignalId: string
  deviceRecordId: string
  measuredValue: number
  expectedValue: number
  deviation: number
  deviationPercent: number
  timestamp: string
  hasGap: boolean
  gapDescription: string | null
}

export interface EnvironmentRecord {
  id: string
  readingRecordId: string
  temperature: number
  humidity: number
  correctionFactor: number
  correctedValue: number
  tempDriftContribution: number
}

export interface AnomalyExplanation {
  id: string
  readingRecordId: string
  category: "standard_expired" | "temp_drift" | "reading_gap"
  description: string
  severity: "low" | "medium" | "high"
  lastModifiedAt: string
}

export interface CalibrationReview {
  id: string
  batchId: string
  standardSignalId: string
  deviceRecordId: string
  readingRecordId: string
  environmentRecordId: string
  anomalyExplanationIds: string[]
  reportExportedAt: string | null
  createdAt: string
}

export interface TraceLink {
  standardSignalId: string
  readingRecordId: string
  reviewId: string
  exportTimestamp: string | null
}

export type AnomalyCategory = "standard_expired" | "temp_drift" | "reading_gap"

export interface FilterState {
  dateRange: [string, string] | null
  deviceNumbers: string[]
  signalTypes: string[]
  anomalyCategories: AnomalyCategory[]
}
