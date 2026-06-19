export type DirtyRowCategory =
  | "permission_override"
  | "data_missing"
  | "format_error"
  | "duplicate_key"
  | "range_violation";

export type DirtyRowStatus = "pending" | "approved" | "rejected" | "escalated";

export interface ScanBatch {
  id: number;
  batch_no: string;
  scan_mode: "full" | "incremental";
  started_at: string;
  finished_at: string;
  total_rows: number;
  dirty_rows: number;
  slow_queries: number;
  operator: string;
  comment: string | null;
  created_at: string;
}

export interface BackupRecord {
  id: number;
  batch_id: number;
  source_table: string;
  snapshot_json: string;
  row_count: number;
  checksum: string;
  created_at: string;
}

export interface DirtyRow {
  id: number;
  batch_id: number;
  backup_id: number;
  category: DirtyRowCategory;
  severity: "high" | "medium" | "low";
  source_table: string;
  source_pk: string;
  row_data_json: string;
  business_explanation: string;
  tech_detail: string;
  status: DirtyRowStatus;
  detected_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
}

export interface ReviewLog {
  id: number;
  dirty_row_id: number;
  batch_id: number;
  action: "approve" | "reject" | "escalate" | "reopen" | "comment";
  old_status: DirtyRowStatus;
  new_status: DirtyRowStatus;
  operator: string;
  reason: string;
  created_at: string;
}

export interface SlowQuery {
  id: number;
  batch_id: number;
  query_signature: string;
  duration_ms: number;
  attribution: string;
  table_involved: string;
  sample_sql: string;
  recommendation: string;
  captured_at: string;
}

export interface ExportLog {
  id: number;
  batch_id: number;
  export_type: "dirty_rows" | "slow_queries" | "batch_report" | "compare";
  file_name: string;
  file_path: string;
  exported_by: string;
  record_count: number;
  created_at: string;
}
