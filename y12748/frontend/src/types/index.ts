export interface ImportBatch {
  id: number
  batch_name: string
  file_name?: string
  imported_by: string
  imported_at: string
  total_records: number
  valid_records: number
  invalid_records: number
  status: string
  remark?: string
}

export interface QuestionRecord {
  id: number
  batch_id?: number
  question_id?: string
  question_content?: string
  material_name?: string
  material_type?: string
  stress_level?: number
  temperature?: number
  lifetime_hours?: number
  unit?: string
  student_answer?: string
  correct_answer?: string
  constraint_condition?: string
  remark?: string
  source?: string
  is_duplicate: boolean
  duplicate_of_id?: number
  has_unit_issue: boolean
  has_empty_value: boolean
  has_mixed_remark: boolean
  has_conflict: boolean
  conflict_detail?: string
  status: string
  created_at: string
  updated_at: string
}

export interface CorrectionHistory {
  id: number
  record_id: number
  field_name: string
  old_value?: string
  new_value?: string
  corrected_by: string
  corrected_at: string
  comment?: string
}

export interface ReviewSession {
  id: number
  batch_id: number
  session_name: string
  session_type: string
  created_by: string
  created_at: string
  started_at?: string
  completed_at?: string
  status: string
  include_wrong_answers: boolean
  include_historical_answers: boolean
  include_conflicts: boolean
  total_items: number
  reviewed_items: number
  passed_items: number
  pending_items: number
  remark?: string
}

export interface ReviewResult {
  id: number
  session_id: number
  record_id: number
  before_status: string
  after_status: string
  reviewer: string
  reviewed_at: string
  review_comment?: string
  is_conflict_resolved: boolean
  conflict_resolution?: string
}

export interface Report {
  id: number
  session_id: number
  batch_id: number
  report_type: string
  generated_by: string
  generated_at: string
  file_name?: string
  file_path?: string
  summary?: Record<string, any>
  curve_data?: Record<string, any>
  status: string
}

export interface ReliabilityCurve {
  id: number
  record_id: number
  batch_id: number
  session_id?: number
  material_name: string
  weibull_shape?: number
  weibull_scale?: number
  mean_lifetime?: number
  median_lifetime?: number
  b10_lifetime?: number
  curve_points?: Record<string, any>
  calculated_at: string
  status: string
}

export interface DataQualityIssue {
  row_index?: number
  question_id?: string
  issue_type: string
  field_name?: string
  description: string
  old_value?: string
  suggestion?: string
}

export interface ImportResult {
  batch_id: number
  total: number
  valid: number
  invalid: number
  issues: DataQualityIssue[]
}

export type UserRole = 'assistant' | 'student'

export const RECORD_STATUS_OPTIONS = [
  { value: 'pending', label: '待处理', color: 'default' },
  { value: 'reviewing', label: '复核中', color: 'processing' },
  { value: 'passed', label: '已通过', color: 'success' },
  { value: 'rejected', label: '需修正', color: 'error' }
] as const

export const BATCH_STATUS_OPTIONS = [
  { value: 'pending', label: '待导入' },
  { value: 'imported', label: '已导入' },
  { value: 'reviewing', label: '复核中' },
  { value: 'completed', label: '已完成' }
]

export const SESSION_STATUS_OPTIONS = [
  { value: 'pending', label: '未开始' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' }
]

export const ISSUE_TYPE_MAP: Record<string, { label: string; color: string }> = {
  empty_value: { label: '空值', color: 'orange' },
  unit_missing: { label: '单位缺失', color: 'red' },
  mixed_remark: { label: '混写备注', color: 'purple' },
  duplicate: { label: '重复记录', color: 'gold' },
  conflict: { label: '数据冲突', color: 'magenta' },
  invalid_numeric: { label: '无效数值', color: 'volcano' }
}
