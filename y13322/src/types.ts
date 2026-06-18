export type ProcessStatus = 'pending' | 'processed' | 'needs_evidence' | 'conflict'

export interface WorkOrder {
  orderId: string
  rawFields: Record<string, string>
  source: string
  status: ProcessStatus
  importedAt: string
  importer: string
  subject: string
}

export interface GradeResponse {
  sampleId: string
  score: number
  labels: string[]
  modelVersion: string
  payload: Record<string, unknown>
  returnedAt: string
}

export interface ManualCorrection {
  correctionId: string
  sampleId: string
  originalScore: number
  manualScore: number
  reason: string
  reviewer: string
  createdAt: string
  overwritten: boolean
  overwriteByNewResult?: boolean
}

export interface SampleEvidence {
  sampleId: string
  orderId: string
  studentName: string
  prompt: string
  essay: string
  machineScore: number
  manualCorrection?: ManualCorrection
  response: GradeResponse
  impact: number
  hasLabelConflict: boolean
  conflictNote?: string
  evidenceUrl: string
}
