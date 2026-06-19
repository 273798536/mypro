export interface MetricValue {
  id: string
  evaluationId: string
  name: string
  value: number
  threshold: number
  driftRatio: number | null
  isDrifted: boolean
}

export interface EvaluationResult {
  id: string
  sampleId: string
  version: string
  evaluatedAt: string
  hasHumanCorrection: boolean
  hasThresholdDrift: boolean
  rawApiResponse: string
  source: string
  metrics: MetricValue[]
}

export interface HumanCorrection {
  id: string
  evaluationId: string
  metricName: string
  originalValue: number
  correctedValue: number
  correctedBy: string
  correctedAt: string
  reason: string
  source: string
}

export interface EvaluationFilter {
  version?: string
  dateFrom?: string
  dateTo?: string
  metricType?: string
  hasHumanCorrection?: boolean
  hasThresholdDrift?: boolean
  page?: number
  pageSize?: number
}

export interface EvaluationStatistics {
  totalSamples: number
  evaluatedCount: number
  humanCorrectionCount: number
  thresholdDriftCount: number
  metricSummaries: MetricSummary[]
}

export interface MetricSummary {
  name: string
  mean: number
  median: number
  min: number
  max: number
}

export interface EvaluationListResponse {
  total: number
  statistics: EvaluationStatistics
  items: EvaluationResult[]
}

export interface MetricDiff {
  name: string
  previous: number
  current: number
  change: number
  changePercent: number
}

export interface SampleChangeDetail {
  sampleId: string
  metricName: string
  previousValue: number
  currentValue: number
}

export interface SampleChanges {
  added: string[]
  removed: string[]
  changed: SampleChangeDetail[]
}

export interface ThresholdChange {
  metricName: string
  previousThreshold: number
  currentThreshold: number
  driftDirection: "up" | "down" | "none"
  driftMagnitude: number
}

export interface CorrectionModification {
  correctionId: string
  previousValue: number
  currentValue: number
  modifiedAt: string
}

export interface CorrectionDiff {
  added: HumanCorrection[]
  removed: HumanCorrection[]
  modified: CorrectionModification[]
}

export interface VersionComparison {
  previousVersion: string
  currentVersion: string
  metricDiffs: MetricDiff[]
  sampleChanges: SampleChanges
  thresholdChanges: ThresholdChange[]
  correctionDiffs: CorrectionDiff[]
}

export interface ThresholdConfig {
  id: string
  metricName: string
  threshold: number
  version: string
  updatedAt: string
}

export interface VersionSnapshot {
  id: string
  version: string
  createdAt: string
  description: string
}
