export interface ParameterSheet {
  id: number;
  file_name: string;
  version: string;
  uploaded_by: string;
  uploaded_at: string;
  notes: string;
  column_mapping: Record<string, string | null>;
  raw_columns: string[];
  row_count: number;
  has_result: boolean;
}

export interface ParameterRow {
  id: number;
  sheet_id: number;
  excel_row_number: number;
  security_code: string | null;
  security_name: string | null;
  weight: number | null;
  x_value: number | null;
  y_value: number | null;
  unit: string | null;
  unit_source: string | null;
  breakpoint: number | null;
  row_status: string;
  warnings: string[];
  raw_data: Record<string, any>;
}

export interface ColumnMatch {
  canonical: string;
  candidates: string[];
  chosen: string | null;
  confidence: number;
}

export interface UploadResponse {
  sheet_id: number;
  file_name: string;
  version: string;
  row_count: number;
  column_matches: ColumnMatch[];
  warnings: string[];
  rows_with_issues: any[];
}

export interface RegressionResult {
  id: number;
  sheet_id: number;
  run_at: string;
  segment_count: number;
  breakpoints: number[];
  coefficients: any;
  r_squared: number | null;
  total_points: number;
  anomaly_count: number;
}

export interface AnomalyPoint {
  id: number;
  result_id: number;
  param_row_id: number;
  security_code: string | null;
  security_name: string | null;
  x_value: number | null;
  y_value: number | null;
  predicted_y: number | null;
  residual: number | null;
  z_score: number | null;
  is_outlier: boolean;
  anomaly_reason: string | null;
  review_status: string;
  reviewer_note: string;
  overridden: boolean;
}

export interface ScatterPoint {
  x: number;
  y: number;
  security_code: string | null;
  security_name: string | null;
  param_row_id: number | null;
  is_anomaly: boolean;
  review_status: string;
}

export interface RegressionChartData {
  points: ScatterPoint[];
  breakpoints: number[];
  fitted_lines: any[];
  r_squared: number | null;
}

export interface ReviewSummary {
  processed: number;
  pending_material: number;
  manual_overrule: number;
  anomalies: AnomalyPoint[];
}

export interface ReviewDashboard {
  sheet: ParameterSheet;
  latest_result: RegressionResult | null;
  chart: RegressionChartData;
  anomalies: AnomalyPoint[];
  review_summary: ReviewSummary;
  change_logs: any[];
}

export interface ReviewUpdate {
  review_status: string;
  reviewer_note?: string;
}
