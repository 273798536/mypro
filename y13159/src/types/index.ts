export interface NameplateRow {
  row_no: number
  device_id: string
  param_name: string
  param_value: number
  unit: string
  alarm_flag: 'none' | 'low' | 'high' | 'error'
  remark: string
  remark_status: 'matched' | 'mismatched' | 'missing'
  bad_data_flag: boolean
  bad_data_reason?: string
}

export interface SymbolError {
  id: number
  nameplate_row: number
  param_name: string
  original_value: number
  corrected_value: number
  direction: string
  impact_scope: string
}

export interface WithdrawRecord {
  id: number
  timestamp: string
  operator: string
  reason: string
  supplementary_note: string
  related_device: string
}

export interface CalculationStep {
  step_no: number
  description: string
  formula: string
  param_a: number
  param_b: number
  from_unit: string
  to_unit: string
  result_a: number
  result_b: number
}

export interface ReportMeta {
  report_date: string
  withdraw_count: number
  symbol_error_count: number
  bad_data_count: number
  remark_match_rate: number
}

export interface ReportData {
  nameplate: NameplateRow[]
  symbol_errors: SymbolError[]
  withdraw_records: WithdrawRecord[]
  calculation_steps: CalculationStep[]
  meta: ReportMeta
}

export interface AppState {
  data: ReportData | null
  isLoaded: boolean
  selectedParamGroup: 'A' | 'B'
  activeTab: string
  highlightedRow: number | null
}
