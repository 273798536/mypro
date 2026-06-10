export type BatchStatus = 'pending' | 'passed' | 'anomaly'
export type DataSourcing = 'old_table' | 'group_supplement' | 'merged'
export type ConclusionType = 'pass' | 'fail' | 'anomaly_detected'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface Batch {
  id: string
  name: string
  status: BatchStatus
  platform: string
  sampleCount: number
  createdAt: string
  description: string
}

export interface Sample {
  id: string
  batchId: string
  sampleName: string
  sequencingResult: string
  samplingLocation: string
  timepoint: string
  dataSourcing: DataSourcing
  isAnomaly: boolean
  umapX: number
  umapY: number
  clusterId: string
  originalTimepoint?: string
  originalLocation?: string
  originalPlatform?: string
  depthValue?: number
}

export interface ReviewRecord {
  id: string
  batchId: string
  reviewer: string
  reviewedAt: string
  conclusion: string
  conclusionType: ConclusionType
  samplesReviewed: string[]
}

export interface AnomalyReview {
  id: string
  reviewRecordId: string
  batchId: string
  operator: string
  operatedAt: string
  reason: string
  oldConclusion: string
  newConclusion: string
  approvalStatus: ApprovalStatus
  approver: string | null
  approvedAt: string | null
  changedSamples: string[]
  oldSamples: Sample[]
  newSamples: Sample[]
}

export interface AuditLog {
  id: string
  entityType: 'batch' | 'review' | 'anomaly'
  entityId: string
  action: string
  operator: string
  operatedAt: string
  detail: string
  beforeData: Record<string, unknown> | null
  afterData: Record<string, unknown> | null
}

export interface ClusterInfo {
  id: string
  label: string
  color: string
  sampleCount: number
  batchId: string
}

export interface DataConflict {
  sampleId: string
  fieldName: string
  oldValue: string
  newValue: string
  resolved: boolean
}

export interface CurrentUser {
  id: string
  name: string
  role: 'breeder' | 'supervisor'
}

export interface AnomalySubmission {
  reason: string
  modificationType: '数据修正' | '样本剔除' | '结论推翻'
  newConclusion: string
}
