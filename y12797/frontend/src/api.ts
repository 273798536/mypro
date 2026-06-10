import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
});

/* ---------- 类型定义 ---------- */
export interface ReactionCondition {
  id?: number;
  condition_name?: string;
  condition_value?: string;
  numeric_value?: number;
  unit?: string;
  normalized_unit?: string;
  normalized_value?: number;
  is_unit_missing?: boolean;
  is_unit_mismatch?: boolean;
  is_abnormal?: boolean;
  issue_description?: string;
  review_note?: string;
  row_order?: number;
}

export interface SubstrateConversion {
  id?: number;
  substrate_name?: string;
  cas_no?: string;
  initial_concentration?: number;
  initial_concentration_unit?: string;
  initial_mass?: number;
  initial_mass_unit?: string;
  volume?: number;
  volume_unit?: string;
  molecular_weight?: number;
  purity?: number;
  final_concentration?: number;
  final_concentration_unit?: string;
  conversion_formula?: string;
  conversion_note?: string;
  is_weighing_insufficient?: boolean;
  weighing_precision?: string;
  weighing_issue_explain?: string;
  row_order?: number;
}

export interface SpectrumData {
  id?: number;
  spectrum_type?: string;
  detection_wavelength?: string;
  column_info?: string;
  retention_time?: number;
  peak_area?: number;
  peak_height?: number;
  peak_name?: string;
  is_overlap?: boolean;
  overlap_with?: string;
  overlap_severity?: string;
  overlap_note?: string;
  raw_data_json?: any;
  interpretation?: string;
  interpretation_linked?: boolean;
  row_order?: number;
}

export interface StatusLog {
  id: number;
  from_status?: string;
  to_status?: string;
  operator?: string;
  operation_note?: string;
  operated_at?: string;
}

export interface AuditTrail {
  id: number;
  action_type?: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  operator?: string;
  trace_note?: string;
  operated_at?: string;
}

export interface ProcessingRecord {
  id: number;
  record_no: string;
  batch_no?: string;
  material_name?: string;
  status: string;
  source_file_name?: string;
  source_format?: string;
  reviewer?: string;
  reviewed_at?: string;
  exporter?: string;
  exported_at?: string;
  remark?: string;
  supplementary_note?: string;
  safety_note?: string;
  processing_opinion?: string;
  has_temp_unit_mix: boolean;
  temp_unit_issue_detail?: any;
  has_peak_overlap: boolean;
  peak_overlap_detail?: any;
  has_weighing_issue: boolean;
  weighing_issue_detail?: any;
  missing_unit_fields?: any[];
  created_at: string;
  updated_at: string;
}

export interface ProcessingRecordDetail extends ProcessingRecord {
  reaction_conditions: ReactionCondition[];
  substrate_conversions: SubstrateConversion[];
  spectrum_data: SpectrumData[];
  status_logs: StatusLog[];
  audit_trails: AuditTrail[];
}

export interface RecordListResp { total: number; items: ProcessingRecord[]; }
export interface ImportResult {
  success: boolean;
  record_id?: number;
  record_no?: string;
  warnings: string[];
  errors: string[];
  missing_units: any[];
  temp_unit_issues: any[];
}
export interface ReviewSubmit {
  reviewer: string;
  processing_opinion?: string;
  safety_note?: string;
  supplementary_note?: string;
  reaction_condition_reviews?: Record<number, string>;
  spectrum_interpretations?: Record<number, string>;
  pass_review: boolean;
}
export interface StatusTransition { operator: string; operation_note?: string; }
export interface ExportResult {
  success: boolean;
  file_name?: string;
  download_url?: string;
  report_plain_explain?: string;
}

/* ---------- API 封装 ---------- */
export const recordsApi = {
  list: (params?: any) => api.get<RecordListResp>('/records', { params }).then(r => r.data),
  get: (id: number) => api.get<ProcessingRecordDetail>(`/records/${id}`).then(r => r.data),
  create: (data: any) => api.post<ProcessingRecord>('/records', data).then(r => r.data),
  fromSample: () => api.post<ProcessingRecord>('/records/from-sample').then(r => r.data),
  importExcel: (file: File, operator?: string) => {
    const fd = new FormData();
    fd.append('file', file);
    if (operator) fd.append('operator', operator);
    return api.post<ImportResult>('/records/import-excel', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: operator ? { operator } : undefined,
    }).then(r => r.data);
  },
  statusNext: (id: number, body: StatusTransition) =>
    api.post<ProcessingRecord>(`/records/${id}/status/next`, body).then(r => r.data),
  statusBack: (id: number, body: StatusTransition) =>
    api.post<ProcessingRecord>(`/records/${id}/status/back`, body).then(r => r.data),
  review: (id: number, body: ReviewSubmit) =>
    api.post<ProcessingRecordDetail>(`/records/${id}/review`, body).then(r => r.data),
  plainExplain: (id: number) =>
    api.get<any>(`/records/${id}/report/plain-explain`).then(r => r.data),
  auditChain: (id: number, anomaly_key?: string) =>
    api.get<any>(`/records/${id}/report/audit-chain`, { params: { anomaly_key } }).then(r => r.data),
  exportReport: (id: number, operator?: string) =>
    api.post<ExportResult>(`/records/${id}/report/export`, null, { params: { operator } }).then(r => r.data),
};

export const STATUS_LABEL: Record<string, string> = {
  imported: '已导入',
  reviewing: '复核中',
  reviewed: '复核通过',
  pending_export: '待导出',
  exported: '已导出',
};

export const STATUS_COLOR: Record<string, string> = {
  imported: 'default',
  reviewing: 'processing',
  reviewed: 'success',
  pending_export: 'warning',
  exported: 'blue',
};
