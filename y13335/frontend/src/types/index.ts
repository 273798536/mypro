export interface Sample {
  id: number
  sample_id: string
  query: string
  source: string
  category: string
  created_at: string
  updated_at: string
}

export interface AlgorithmVersion {
  id: number
  version: string
  description: string
  threshold_config: Record<string, any>
  model_info: Record<string, any>
  is_active: boolean
  created_at: string
}

export interface EvaluationRecord {
  id: number
  sample_id: number
  version_id: number
  recall_results: any[]
  score: number
  is_pass: boolean
  is_repeat_eval: boolean
  eval_time: string
  raw_response: Record<string, any>
  remark: string
  sample?: Sample
  version?: AlgorithmVersion
}

export interface ManualCorrection {
  id: number
  sample_id: number
  version_id: number | null
  source: string
  process_status: string
  correction_data: Record<string, any>
  correction_type: string
  operator: string
  remark: string
  created_at: string
  updated_at: string
  sample?: Sample
}

export interface ReviewHistory {
  id: number
  sample_id: number
  action_type: string
  before_data: Record<string, any>
  after_data: Record<string, any>
  operator: string
  remark: string
  created_at: string
}

export interface ReviewConclusion {
  id: number
  conclusion_id: string
  version_id: number
  title: string
  summary: string
  total_samples: number
  pass_count: number
  fail_count: number
  correction_count: number
  metrics: Record<string, any>
  highlights: string[]
  is_final: boolean
  operator: string
  created_at: string
  updated_at: string
  version?: AlgorithmVersion
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface VersionCompareResult {
  version_old: AlgorithmVersion
  version_new: AlgorithmVersion
  total_samples: number
  same_count: number
  diff_count: number
  pass_increase: number
  pass_decrease: number
  threshold_diff: Record<string, any>
  sample_diffs: any[]
  correction_stats: Record<string, any>
}

export interface DashboardData {
  total_samples: number
  total_versions: number
  total_corrections: number
  total_conclusions: number
  active_version: AlgorithmVersion | null
  pending_corrections: number
  recent_histories: ReviewHistory[]
}
