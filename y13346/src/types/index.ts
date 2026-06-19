export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'corrected'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type OperatorRole = 'algorithm' | 'risk_ops' | 'system'

export interface ModelVersion {
  id: string
  name: string
  createdAt: string
  description?: string
}

export interface SourceMaterial {
  id: string
  type: 'code_diff' | 'pr_description' | 'commit_log' | 'ci_log'
  title: string
  content: string
  url?: string
  reviewRecordId: string
}

export interface ManualCorrection {
  id: string
  reviewRecordId: string
  correctedRiskLevel: RiskLevel
  correctedStatus: ReviewStatus
  reason: string
  followUpNote?: string
  operator: string
  operatorRole: OperatorRole
  correctedAt: string
  modelVersionId: string
  overriddenPredictionId?: string
}

export interface PredictionSnapshot {
  id: string
  reviewRecordId: string
  modelVersionId: string
  predictedRiskLevel: RiskLevel
  predictedStatus: ReviewStatus
  confidence: number
  predictedAt: string
  featureScores: Record<string, number>
}

export interface ReviewRecord {
  id: string
  prId: string
  prTitle: string
  author: string
  repo: string
  createdAt: string
  currentStatus: ReviewStatus
  currentRiskLevel: RiskLevel
  sourceMaterialIds: string[]
  latestPredictionId?: string
  manualCorrectionId?: string
  suspendedReason?: string
  isSuspended: boolean
  exceptionQueueId?: string
}

export interface ExceptionQueueItem {
  id: string
  reviewRecordId: string
  type: 'duplicate_evaluation' | 'risk_level_conflict' | 'manual_vs_prediction' | 'model_version_change'
  severity: RiskLevel
  status: 'open' | 'in_review' | 'resolved'
  reportedAt: string
  resolvedAt?: string
  resolvedBy?: string
  resolutionNote?: string
  description: string
}

export interface HistoryEntry {
  id: string
  reviewRecordId: string
  eventType: 'prediction' | 'manual_correction' | 'status_change' | 'suspend' | 'resolve_exception'
  operator: string
  operatorRole: OperatorRole
  timestamp: string
  beforeSnapshot: Record<string, unknown>
  afterSnapshot: Record<string, unknown>
  note?: string
}

export interface GrayComparePoint {
  recordId: string
  prTitle: string
  baseline: {
    riskLevel: RiskLevel
    status: ReviewStatus
    modelVersion: string
    hasManualCorrection: boolean
  }
  candidate: {
    riskLevel: RiskLevel
    status: ReviewStatus
    modelVersion: string
    confidence: number
  }
  diff: {
    riskChanged: boolean
    statusChanged: boolean
    isSuspended: boolean
    hasManualOverrideConflict: boolean
  }
}
