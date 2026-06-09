export type RecordStatus =
  | 'draft'
  | 'imported'
  | 'reviewing'
  | 'confirmed'
  | 'reported';

export const STATUS_LABEL: Record<RecordStatus, string> = {
  draft: '草稿',
  imported: '已导入',
  reviewing: '复核中',
  confirmed: '已确认',
  reported: '已报告',
};

export const STATUS_COLOR: Record<RecordStatus, string> = {
  draft: '#9ca3af',
  imported: '#3b82f6',
  reviewing: '#f59e0b',
  confirmed: '#10b981',
  reported: '#6366f1',
};

export interface BufferComponent {
  id?: number;
  reagent_name: string;
  formula?: string | null;
  molar_mass: number;
  target_concentration: number;
  actual_concentration?: number | null;
  theoretical_mass?: number | null;
  actual_mass?: number | null;
  purity: number;
}

export interface TemperaturePoint {
  id?: number;
  time_minute: number;
  set_temp: number;
  actual_temp: number;
}

export interface WeighingRecord {
  id?: number;
  reagent_name: string;
  theoretical_mass: number;
  actual_mass: number;
  tolerance_pct: number;
  error_pct?: number | null;
  is_pass?: boolean | null;
}

export interface StatusLog {
  id: number;
  from_status: string;
  to_status: string;
  operator?: string | null;
  remark?: string | null;
  created_at: string;
}

export interface BufferRecordSummary {
  id: number;
  batch_no: string;
  record_date: string;
  buffer_name: string;
  target_ph: number;
  target_volume: number;
  status: RecordStatus;
  precision_pass?: boolean | null;
  temp_curve_pass?: boolean | null;
  operator?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BufferRecordDetail extends BufferRecordSummary {
  actual_ph?: number | null;
  actual_volume?: number | null;
  reviewer?: string | null;
  remark?: string | null;
  reported_at?: string | null;
  components: BufferComponent[];
  temperature_points: TemperaturePoint[];
  weighing_records: WeighingRecord[];
  status_logs: StatusLog[];
}

export interface ConcentrationCalcRequest {
  molar_mass: number;
  volume_l: number;
  concentration_mol?: number | null;
  mass_g?: number | null;
}

export interface ConcentrationCalcResponse {
  concentration_mol?: number | null;
  mass_g?: number | null;
  molar_mass: number;
  volume_l: number;
  note: string;
}

export interface BalanceCalcRequest {
  target_ph: number;
  acid_pka: number;
  total_concentration: number;
  volume_l: number;
  acid_molar_mass: number;
  salt_molar_mass: number;
  acid_name?: string;
  salt_name?: string;
}

export interface BalanceCalcResponse {
  target_ph: number;
  acid_pka: number;
  ratio_base_acid: number;
  acid_concentration: number;
  salt_concentration: number;
  acid_mass_g: number;
  salt_mass_g: number;
  acid_name: string;
  salt_name: string;
  note: string;
}

export interface StatusTransition {
  target_status: RecordStatus;
  operator?: string | null;
  remark?: string | null;
}

export interface BufferRecordCreate {
  batch_no: string;
  record_date: string;
  buffer_name: string;
  target_ph: number;
  target_volume: number;
  actual_ph?: number | null;
  actual_volume?: number | null;
  operator?: string | null;
  reviewer?: string | null;
  remark?: string | null;
  status: RecordStatus;
  components: BufferComponent[];
  temperature_points: TemperaturePoint[];
  weighing_records: WeighingRecord[];
}

export type BufferRecordUpdate = Partial<Omit<BufferRecordCreate, 'batch_no'>>;
