export enum SampleStatus {
  IMPORTED = 'imported',
  PENDING_REVIEW = 'pending_review',
  QC_PASSED = 'qc_passed',
  QC_FAILED = 'qc_failed',
  STATISTICS_DONE = 'statistics_done',
  REPORT_GENERATED = 'report_generated'
}

export enum ReviewResult {
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NEEDS_FIX = 'needs_fix'
}

export interface Batch {
  id: string
  batchNo: string
  name: string
  createdAt: string
  createdBy: string
  status: SampleStatus
  remark?: string
}

export interface Sample {
  id: string
  batchId: string
  barcode: string
  groupName: string
  seedType: string
  sowingDate?: string
  germinationDates: string[]
  totalSeeds: number
  germinatedSeeds: number
  germinationRate: number
  status: SampleStatus
  qcPassed: boolean
  qcRemark?: string
  abnormal: boolean
  abnormalRemark?: string
  pathologyRemark?: string
  handlingOpinion?: string
  createdAt: string
  updatedAt: string
}

export interface ProcessingRecord {
  id: string
  sampleId: string
  batchId: string
  recordType: 'qc' | 'statistics' | 'review' | 'status_change'
  operator: string
  operationTime: string
  oldValue?: string
  newValue?: string
  remark?: string
  shared: boolean
}

export interface AuditLog {
  id: string
  sampleId?: string
  batchId?: string
  operation: string
  operator: string
  operateTime: string
  fieldName?: string
  oldValue?: string
  newValue?: string
  reason?: string
  ip?: string
}

export interface StatusTransition {
  id: string
  batchId: string
  sampleId?: string
  fromStatus: SampleStatus
  toStatus: SampleStatus
  operator: string
  transitionTime: string
  remark?: string
}

export interface ImportResult {
  success: number
  duplicates: number
  errors: number
  messages: string[]
  batchId: string
}

export interface ReviewData {
  sampleId: string
  result: ReviewResult
  operator: string
  reason: string
  fixSuggestion?: string
  pathologyRemark?: string
  handlingOpinion?: string
  missingTimePointApproved?: boolean
}

export interface QcResult {
  sampleId: string
  passed: boolean
  operator: string
  remark?: string
}

export interface StatisticsResult {
  batchId: string
  groupName: string
  sampleCount: number
  avgGerminationRate: number
  maxGerminationRate: number
  minGerminationRate: number
  abnormalCount: number
  qcPassRate: number
}

export interface ReportData {
  batchId: string
  batchNo: string
  exportTime: string
  operator: string
  statistics: StatisticsResult[]
  samples: Sample[]
}
