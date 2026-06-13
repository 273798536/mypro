export type TorqueUnit = 'N·m' | 'kg·m' | 'lb·ft';

export interface MotorTorqueRecord {
  id: string;
  timestamp: string;
  device_id: string;
  device_name: string;
  torque_value: number;
  torque_unit: TorqueUnit;
  rated_torque: number;
  speed: number;
  current: number;
  temperature: number;
  maintenance_note_raw: string;
  maintenance_note_cleaned?: string;
  is_data_dirty: boolean;
  is_device_duplicate: boolean;
  duplicate_device_ids?: string[];
  is_outlier: boolean;
  outlier_reason?: 'extreme_high' | 'extreme_low' | 'unit_mismatch';
  data_source: 'manual' | 'auto_import' | 'api';
  created_at: string;
  tags: string[];
}

export interface JumpDiagnosisResult {
  record_id: string;
  timestamp: string;
  jump_value: number;
  jump_percentage: number;
  cause: 'threshold_cross' | 'unit_change' | 'name_mismatch' | 'unknown';
  cause_detail: string;
  previous_record_id?: string;
  previous_value?: number;
  previous_unit?: TorqueUnit;
  previous_name?: string;
}

export interface FilterCriteria {
  device_ids: string[];
  time_range: [string, string] | null;
  torque_range: [number, number] | null;
  show_outliers_only: boolean;
  show_duplicates_only: boolean;
  show_dirty_data_only: boolean;
  units: TorqueUnit[];
  keyword: string;
}

export interface PageSummary {
  total_records: number;
  filtered_records: number;
  outlier_count: number;
  duplicate_count: number;
  dirty_data_count: number;
  max_torque: number;
  min_torque: number;
  avg_torque: number;
  device_count: number;
  time_span: [string, string] | null;
  filter_criteria: FilterCriteria;
  jump_events: JumpDiagnosisResult[];
  export_timestamp?: string;
}

export interface ExportConfig {
  include_summary: boolean;
  include_filter_criteria: boolean;
  include_raw_data: boolean;
  include_diagnosis: boolean;
  include_outlier_markers: boolean;
  format: 'xlsx' | 'csv';
}
