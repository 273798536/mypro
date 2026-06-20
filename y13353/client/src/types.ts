export interface EvalTask {
  id: number;
  name: string;
  model_version: string;
  index_type: string;
  index_params: string;
  status: 'pending' | 'running' | 'completed' | 'warning' | 'error';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EvalResult {
  id: number;
  task_id: number;
  recall_at_1: number;
  recall_at_10: number;
  recall_at_100: number;
  precision_at_1: number;
  avg_latency_ms: number;
  p99_latency_ms: number;
  qps: number;
  memory_usage_mb: number;
  cpu_usage: number;
  index_size_gb: number;
  build_time_s: number;
  overall_score: number;
  created_at: string;
}

export interface SampleEvidence {
  id: number;
  task_id: number;
  query_id: string;
  query_text: string;
  expected_result: string;
  actual_result: string;
  is_correct: number;
  score: number;
  rank: number;
  evidence_type: string;
  created_at: string;
}

export interface ManualJudgment {
  id: number;
  task_id: number;
  evidence_id: number | null;
  judgment_type: string;
  original_value: string | null;
  modified_value: string;
  reason: string;
  judged_by: string;
  is_temporary: number;
  created_at: string;
  task_name?: string;
}

export interface MaterialLink {
  id: number;
  task_id: number;
  source_name: string;
  target_name: string;
  link_type: string;
  confidence: number;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
}

export interface FeatureDelay {
  id: number;
  task_id: number;
  feature_name: string;
  expected_date: string;
  actual_date: string | null;
  status: 'pending' | 'confirmed' | 'resolved';
  suspected_reason: string | null;
  impact_scope: string | null;
  affected_samples: number | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  created_at: string;
  task_name?: string;
}

export interface ParamChange {
  id: number;
  task_id: number;
  param_name: string;
  old_value: string | null;
  new_value: string;
  changed_by: string;
  change_reason: string | null;
  result_impact: string | null;
  created_at: string;
}

export interface TaskComment {
  id: number;
  task_id: number;
  comment: string;
  comment_by: string;
  created_at: string;
}

export interface TaskDetail extends EvalTask {
  result: EvalResult | null;
  param_changes: ParamChange[];
  manual_judgments: ManualJudgment[];
  material_links: MaterialLink[];
  feature_delays: FeatureDelay[];
  comments: TaskComment[];
  evidence_summary: {
    total: number;
    correct: number;
    incorrect: number;
  };
}

export interface TaskComparison {
  task_a: TaskDetail;
  task_b: TaskDetail;
  differences: {
    field: string;
    value_a: any;
    value_b: any;
    change_percent: number | null;
  }[];
}

export interface HandoverInfo {
  latest_tasks: EvalTask[];
  pending_delays: FeatureDelay[];
  temporary_judgments: ManualJudgment[];
  sample_locations: { task_id: number; task_name: string; evidence_count: number }[];
  export_methods: { name: string; description: string; endpoint: string }[];
}

export const statusTextMap: Record<string, string> = {
  pending: '待处理',
  running: '运行中',
  completed: '已完成',
  warning: '有异常',
  error: '错误'
};

export const delayStatusTextMap: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  resolved: '已解决'
};
