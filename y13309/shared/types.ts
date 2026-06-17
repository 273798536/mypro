export type SampleStatus = 'pending' | 'confirmed' | 'withdrawn' | 'exception'

export interface Citation {
  ref: string
  text: string
}

export interface HistoryEntry {
  at: string
  action: string
  note?: string
}

export interface Sample {
  id: string
  materialName: string
  canonicalName?: string
  nameMismatch: boolean
  materialContent: string
  question: string
  citations: Citation[]
  citationMissing: boolean
  modelOutput: string
  conclusion: string
  status: SampleStatus
  threshold: number
  thresholdVersion: string
  oldJudgment?: string
  judgmentChangeReason?: string
  reevaluated: boolean
  createdAt: string
  confirmedAt?: string
  withdrawnAt?: string
  history: HistoryEntry[]
}

export interface RawMaterial {
  id?: string
  materialName: string
  canonicalName?: string
  materialContent: string
  question: string
  citations?: Citation[]
  modelOutput: string
  conclusion: string
  threshold: number
  thresholdVersion: string
  oldJudgment?: string
  judgmentChangeReason?: string
  reevaluated?: boolean
}

export interface MaterialFlags {
  citationMissing: boolean
  nameMismatch: boolean
}

export interface SamplesResponse {
  samples: Sample[]
  thresholdVersions: string[]
}

export interface ImportPayload {
  materials: RawMaterial[]
}

export interface ImportError {
  index: number
  reason: string
}

export interface ImportResult {
  inserted: number
  errors: ImportError[]
  samples: Sample[]
}

export interface PatchPayload {
  action: 'confirm' | 'withdraw'
}

export interface ApiError {
  error: string
}
