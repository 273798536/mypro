export type BatchStatus =
  | '待导入'
  | '已导入'
  | '冲突检测中'
  | '待复核'
  | '复核中'
  | '已完成';

export type AnomalyCategory = '补材料' | '改口径' | '无异常';

export type ResultGrade = '可用' | '暂缓' | '重新采集';

export interface ProcessBatch {
  id: number;
  batch_name: string;
  status: BatchStatus;
  created_at: string;
  updated_at: string;
  remark?: string;
  operator?: string;
}

export interface QuestionItem {
  id: number;
  batch_id: number;
  original_row_no: number;
  question_code: string;
  question_title?: string;
  image_name?: string;
  source_remark?: string;
  kkt_params_json?: string;
  difficulty?: string;
  knowledge_point?: string;
  created_at: string;
}

export interface ParamRecord {
  id: number;
  batch_id: number;
  original_row_no: number;
  question_code: string;
  param_key: string;
  param_value?: string;
  source_sheet?: string;
  source_remark?: string;
  created_at: string;
}

export interface ConflictRecord {
  id: number;
  batch_id: number;
  question_id?: number;
  param_record_id?: number;
  question_code: string;
  conflict_type: string;
  conflict_field?: string;
  question_value?: string;
  param_value?: string;
  description: string;
  resolution_suggestion?: string;
  is_resolved: boolean;
  resolved_at?: string;
  created_at: string;
}

export interface ReviewRecord {
  id: number;
  batch_id: number;
  question_id: number;
  anomaly_category: AnomalyCategory;
  result_grade: ResultGrade;
  reviewer?: string;
  review_note?: string;
  next_step?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  question?: QuestionItem;
}

export interface ErrorAnalysis {
  id: number;
  batch_id: number;
  question_id: number;
  kkt_violation_degree: number;
  stationarity_error: number;
  primal_feasibility_error: number;
  dual_feasibility_error: number;
  complementarity_error: number;
  overall_error: number;
  is_excessive: boolean;
  analysis_detail?: string;
  created_at: string;
  question?: QuestionItem;
}

export interface CounterExample {
  id: number;
  question_id: number;
  example_content: string;
  source_reference?: string;
  explanation?: string;
  created_at: string;
}

export interface HistorySnapshot {
  id: number;
  batch_id: number;
  snapshot_name: string;
  snapshot_type: string;
  snapshot_data: string;
  created_at: string;
  created_by?: string;
}

export interface ExportReport {
  id: number;
  batch_id: number;
  report_name: string;
  report_type: string;
  file_path: string;
  file_size?: number;
  exported_by?: string;
  created_at: string;
}

export interface BatchDetailResponse {
  batch: ProcessBatch;
  questions_count: number;
  param_records_count: number;
  conflicts_count: number;
  conflicts_unresolved_count: number;
  reviews_count: number;
  error_analyses_count: number;
  excessive_errors_count: number;
}

export interface ReviewSummaryResponse {
  total_questions: number;
  usable_count: number;
  pending_count: number;
  recollect_count: number;
  need_material_count: number;
  need_standard_count: number;
  no_anomaly_count: number;
}

export interface ErrorDistribution {
  total: number;
  excessive_count: number;
  average_error: number;
  distribution: Record<string, number>;
  warn_threshold: number;
  critical_threshold: number;
}
