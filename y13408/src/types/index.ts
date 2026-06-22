export type BoundaryType = "normal" | "empty_set" | "zero_value" | "extrapolation_overflow"

export type ReviewStatus = "pending" | "confirmed" | "overridden"

export type AnomalySeverity = "warning" | "critical"

export interface Sample {
  id: string
  batchId: string
  parameterName: string
  originalValue: number | null
  convertedValue: number | null
  unit: string
  displayUnit: string
  conversionFactor: number
  boundaryType: BoundaryType
  reviewStatus: ReviewStatus
  sourceMaterialId: string
  affectedConclusionId: string
  supplementNote: string
  createdAt: string
}

export interface OverrideRecord {
  id: string
  sampleId: string
  previousValue: number | null
  newValue: number | null
  reason: string
  operator: string
  createdAt: string
}

export interface Anomaly {
  id: string
  sampleId: string
  type: BoundaryType
  severity: AnomalySeverity
  triggerMaterialId: string
  triggerMaterialDesc: string
  affectedConclusionId: string
  affectedConclusionDesc: string
  suggestion: string
  resolvedAt: string | null
}

export interface ComputedStats {
  totalSamples: number
  boundaryAnomalies: number
  pendingReview: number
  overridden: number
}

export interface FilterState {
  batchId: string
  parameterName: string
  boundaryType: BoundaryType | ""
  reviewStatus: ReviewStatus | ""
}
