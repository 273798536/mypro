export type EvalStatus = 'PASS' | 'FAIL' | 'REVIEW';
export type TaskStatus = 'PENDING' | 'COMPLETED' | 'FAILED';
export type FinalDecision = 'APPROVED' | 'REVIEW_REQUIRED' | 'RERUN';

export interface SafetyRule {
  id: string;
  text: string;
  version: string;
}

export interface SafetyRulesSnapshot {
  rules: SafetyRule[];
}

export interface PromptVersion {
  id: number;
  version_tag: string;
  content: string;
  safety_rules_snapshot: SafetyRulesSnapshot;
  change_log: string;
  created_at: string;
}

export interface EvalSample {
  id: number;
  prompt_version_id: number;
  input_text: string;
  model_output: string;
  score: number;
  safety_violations: string[];
  eval_status: EvalStatus;
  source_material_ref: string;
  created_at: string;
  latest_decision?: FinalDecision | null;
  latest_reason?: string | null;
}

export interface SampleDiff {
  sample_id: number;
  source_material_ref: string;
  input_text: string;
  output_a: string;
  output_b: string;
  score_a: number;
  score_b: number;
  status_a: EvalStatus;
  status_b: EvalStatus;
  violations_a: string[];
  violations_b: string[];
  decision?: FinalDecision | null;
  reason?: string | null;
  score_delta: number;
}

export interface MetricsSummary {
  total_samples: number;
  pass_rate_a: number;
  pass_rate_b: number;
  avg_score_a: number;
  avg_score_b: number;
  violation_count_a: number;
  violation_count_b: number;
  improved_count: number;
  regressed_count: number;
  unchanged_count: number;
  decision_counts: Record<string, number>;
}

export interface GrayCompareTask {
  id: number;
  version_a_id: number;
  version_b_id: number;
  version_a_tag: string;
  version_b_tag: string;
  metrics_summary: MetricsSummary;
  status: TaskStatus;
  consistency_flag: boolean;
  created_at: string;
  sample_diffs?: SampleDiff[];
  summary_hash: string;
}

export interface HumanFeedback {
  id: number;
  eval_sample_id: number;
  evaluator: string;
  feedback_text: string;
  original_score: number;
  revised_score: number;
  affects_safety_rules: boolean;
  affected_rule_ids: string[];
  final_decision: FinalDecision;
  reason: string;
  created_at: string;
}

export interface DistributionItem { bucket: string; count: number; }
export interface ViolationItem { rule_id: string; count: number; }
export interface TrendPoint {
  version_tag: string;
  metric: number;
  metric_pass_rate?: number;
  timestamp: string;
}

export interface ReplayTrace {
  sample_id: number;
  source_material_ref: string;
  input_text: string;
  model_output: string;
  score: number;
  eval_status: EvalStatus;
  feedback_history: HumanFeedback[];
  affected_rules: SafetyRule[];
  prompt_version_tag: string;
  prompt_content_snippet: string;
}

export interface ActionableErrorResp {
  error_code: string;
  message: string;
  action: string;
  request_id: string;
}
