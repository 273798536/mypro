export interface ReagentBatch {
  id: string
  batchNo: string
  reagentName: string
  supplier: string
  receivedDate: string
}

export interface Candidate {
  id: string
  sampleId: string
  targetSite: string
  offTargetSite: string
  sequence: string
  mismatchCount: number
  strand: '+' | '-'
  reagentBatchId: string
  negControlResult: 'normal' | 'abnormal' | 'pending'
  status: 'normal' | 'anomaly' | 'approved'
  processingOpinion: string
  createdAt: string
  updatedAt: string
}

export interface AuditLog {
  id: string
  candidateId: string
  reagentBatchId: string
  operator: string
  operatedAt: string
  action: 'mark_anomaly' | 'approve_anomaly' | 'modify_opinion'
  oldValue: string
  newValue: string
  reason: string
}

export interface FilterState {
  batchNo: string
  dateRange: [string, string] | null
  status: string
  negControlResult: string
  search: string
}
