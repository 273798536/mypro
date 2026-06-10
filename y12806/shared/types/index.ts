export interface ReagentLot {
  id: string;
  lot_number: string;
  reagent_name: string;
  manufacturer: string;
  production_date: string;
  expiry_date: string;
  notes?: string;
}

export interface SamplingSite {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description?: string;
}

export interface Sample {
  id: string;
  lot_id: string;
  sample_code: string;
  sampling_site_id: string;
  collection_date: string;
  micrograph_url?: string;
  concentration?: number;
  is_abnormal?: boolean;
}

export interface AnalysisRun {
  id: string;
  lot_id: string;
  run_index: number;
  algorithm_version: string;
  executed_at: string;
  operator: string;
  parameters?: Record<string, unknown>;
}

export interface Band {
  id: string;
  sample_id: string;
  run_id: string;
  position_mm: number;
  molecular_weight_kda: number;
  gray_value: number;
  quality_score: number;
  label?: string;
  label_category: 'target' | 'nonspecific' | 'smear' | 'missing';
  needs_supplement?: boolean;
  human_confirmed?: boolean;
  confirm_status: 'pending' | 'confirmed' | 'rejected';
  reviewer?: string;
  confirmed_at?: string;
  reject_reason?: string;
  supplement_fields?: Record<string, unknown>;
}

export interface ReviewLog {
  id: string;
  band_id: string;
  action: 'confirm' | 'reject' | 'supplement' | 'change_lot';
  operator: string;
  created_at: string;
  old_value?: string | number | null;
  new_value?: string | number | null;
  comment?: string;
}

export interface DiffRow {
  band_id: string;
  sample_code: string;
  field_name: string;
  old_value: string | number | null;
  new_value: string | number | null;
  severity: 'warning' | 'danger' | 'info';
}

export interface GroupStats {
  category: string;
  count_before: number;
  count_after: number;
}

export interface DiffReport {
  lot_id: string;
  old_run_id: string;
  new_run_id: string;
  total_changed: number;
  rows: DiffRow[];
  group_stats_before: GroupStats[];
  group_stats_after: GroupStats[];
}

export interface TimelineNode {
  run_id: string;
  run_index: number;
  algorithm_version: string;
  executed_at: string;
  operator: string;
  summary: string;
  band_count: number;
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'pdf';
  lot_ids: string[];
  include_photos: boolean;
  include_charts: boolean;
}

export interface ExportPreview {
  row_count: number;
  fields: string[];
  lot_range: string;
  sample_count: number;
}

export interface DemoCase {
  id: string;
  name: string;
  description: string;
  purpose: string;
  band_count: number;
  anomaly_types: string[];
}

export interface ReviewStepProgress {
  step: 1 | 2 | 3;
  name: '重复运行' | '补录' | '人工确认';
  total: number;
  done: number;
  percent: number;
}

export interface LotStats {
  lot_id: string;
  lot_number: string;
  sample_count: number;
  band_count: number;
  avg_quality: number;
  pending_count: number;
  anomaly_count: number;
}
