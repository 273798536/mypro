export type Conclusion = '通过' | '待确认' | '驳回'

export type Preference = 'a' | 'b' | 'tie'

export interface AnnotationRecord {
  record_id: string
  model_version: string
  prompt: string
  response_a: string
  response_b: string
  human_label: Preference
  rm_prediction: Preference | null
  annotator: string | null
  created_at: string
  updated_at: string
}

export interface ConclusionRow {
  record_id: string
  conclusion: Conclusion
  bias_type: string | null
  severity: string | null
  reviewer: string | null
  feedback: string | null
  concluded_at: string | null
  version: string | null
}

export interface ReviewRow extends AnnotationRecord {
  conclusion: Conclusion | null
  bias_type: string | null
  severity: string | null
  reviewer: string | null
  feedback: string | null
  concluded_at: string | null
  conclusion_version: string | null
  versions: string[]
  has_disagreement: boolean
}

export interface ReviewFilters {
  version?: string
  model_version?: string
  conclusion?: Conclusion | 'pending'
  bias_type?: string
  q?: string
}

export interface Summary {
  total: number
  reviewed: number
  pending: number
  pass: number
  pending_confirm: number
  rejected: number
  distribution: Array<{ conclusion: string; count: number }>
}

export interface VersionInfo {
  version: string
  label: string | null
  created_at: string
  record_count: number
  summary: Summary | null
}

export interface CompareRow {
  record_id: string
  model_version: string
  prompt: string
  rm_prediction: Preference | null
  human_label: Preference
  conclusion: Conclusion | null
  bias_type: string | null
  has_disagreement: boolean
  in_a: boolean
  in_b: boolean
  in_both: boolean
}

export interface ImportResult {
  version: string
  label: string
  imported: number
  updated: number
  total: number
}

export interface AnnotationInput {
  record_id: string
  model_version: string
  prompt: string
  response_a: string
  response_b: string
  human_label: Preference
  rm_prediction: Preference | null
  annotator: string | null
}
