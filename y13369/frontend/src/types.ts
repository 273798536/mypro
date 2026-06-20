export interface EvaluationRun {
  id: number;
  model_version: string;
  evaluator: string;
  source_file: string;
  original_filename: string;
  status: string;
  notes: string;
  created_at: string;
  record_count: number;
}

export interface EvaluationRecord {
  id: number;
  run_id: number;
  query_id: string;
  query_text: string;
  expected_docs: any[];
  recalled_docs: any[];
  metrics: Record<string, any>;
  original_fields: Record<string, any>;
  anomaly_flag: string;
  anomaly_desc: string;
  is_archived: boolean;
  created_at: string;
  judgments: ManualJudgment[];
  anomalies: AnomalyRecord[];
}

export interface ManualJudgment {
  id: number;
  record_id: number;
  judge_type: string;
  before_value: Record<string, any>;
  after_value: Record<string, any>;
  reason: string;
  judge_name: string;
  created_at: string;
}

export interface AnomalyRecord {
  id: number;
  record_id: number;
  anomaly_type: string;
  original_description: string;
  status: string;
  handler: string;
  notes: string;
  created_at: string;
}

export interface DashboardStats {
  total_runs: number;
  total_records: number;
  total_judgments: number;
  open_anomalies: number;
  model_versions: string[];
  recent_runs: EvaluationRun[];
}

export interface ComparisonResult {
  run_a_id: number;
  run_b_id: number;
  model_a: string;
  model_b: string;
  total_queries: number;
  common_queries: number;
  only_in_a: number;
  only_in_b: number;
  metric_diffs: any[];
  query_diffs: any[];
  only_a_queries?: string[];
  only_b_queries?: string[];
}

export interface ImportResult {
  run_id: number;
  record_count: number;
  warnings: string[];
  auto_mapped_fields: { source: string; standard: string }[];
}
