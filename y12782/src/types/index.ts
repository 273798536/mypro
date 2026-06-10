export interface StandardBatch {
  id: string
  batchNo: string
  reagentName: string
  reagentCasNo?: string
  nominalConcentration: number
  nominalConcentrationUnit: string
  actualConcentration?: number
  concentrationErrorCause?: string
  preparationDate: string
  validUntilDate: string
  preparator: string
  auditor?: string
  status: 'draft' | 'prepared' | 'audited' | 'expired' | 'invalid'
  remark?: string
  createdAt: string
  updatedAt: string
}

export interface SpectrumPeak {
  retentionTime: number
  height: number
  area: number
  width: number
  compoundName?: string
}

export interface SpectrumRecord {
  id: string
  batchId: string
  importHash: string
  instrumentName: string
  instrumentNo: string
  analyst: string
  analysisDate: string
  peaks: SpectrumPeak[]
  hasOverlap: boolean
  overlapDetails: string[]
  conclusion: 'qualified' | 'unqualified' | 'pending'
  rawData: { rt: number; intensity: number }[]
  createdAt: string
}

export interface ProcessRecord {
  id: string
  batchId: string
  relatedSpectrumId?: string
  relatedAnomalyId?: string
  operator: string
  operationType:
    | 'create_batch'
    | 'update_batch'
    | 'import_spectrum'
    | 'dedupe_spectrum'
    | 'detect_overlap'
    | 'mark_anomaly'
    | 'add_safety_hint'
    | 'handle_anomaly'
    | 'audit'
    | 'export_report'
  description: string
  safetyHint?: string
  createdAt: string
}

export interface AnomalyRecord {
  id: string
  batchId: string
  relatedSpectrumId?: string
  anomalyType:
    | 'peak_overlap'
    | 'concentration_error'
    | 'expired'
    | 'instrument_error'
    | 'operation_error'
    | 'other'
  severity: 'low' | 'medium' | 'high'
  title: string
  detail: string
  safetyHint: string
  plainLanguageExplanation: string
  status: 'open' | 'handling' | 'resolved' | 'closed'
  handler?: string
  handlingOpinion?: string
  handledAt?: string
  reporter: string
  reportedAt: string
  processRecordIds: string[]
}

export interface ValidityReport {
  id: string
  batchId: string
  generatedAt: string
  generatedBy: string
  summary: string
  plainLanguageSummary: string
  spectrumConclusion: string
  anomalySummary: string
  validityConclusion: 'valid' | 'invalid' | 'warning'
  exportFormat?: string
}
