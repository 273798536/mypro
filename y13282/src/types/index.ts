export type RecordStatus = "normal" | "duplicate" | "merged";

export type ChangeType =
  | "add"
  | "duplicate"
  | "intersection_error"
  | "bad_data"
  | "update";

export type BadDataType = "missing" | "invalid" | "outlier";

export type ErrorType = "merged_should_split" | "split_should_merge";

export type BatchType = "import" | "manual";

export type ComplaintSource = "巡检照片" | "电话" | "微信群" | "手动补录" | "合并记录";

export interface ComplaintRecord {
  id: string;
  fingerprint: string;
  title: string;
  description: string;
  location_name: string;
  lat: number;
  lng: number;
  intersection: string;
  reporter: string;
  report_time: string;
  complaint_source: ComplaintSource;
  photo_url: string;
  source_batch_id: string;
  status: RecordStatus;
  is_intersection_error: boolean;
  original_row_ref: string;
  created_at: string;
  updated_at: string;
}

export interface ImportBatch {
  id: string;
  name: string;
  type: BatchType;
  record_count: number;
  duplicate_count: number;
  intersection_error_count: number;
  bad_data_count: number;
  created_at: string;
}

export interface MergeHistory {
  id: string;
  source_record_id: string;
  target_record_id: string;
  merged_content: string;
  original_sources_json: string;
  created_at: string;
}

export interface BadDataFlag {
  id: string;
  record_id: string;
  field_name: string;
  issue_type: BadDataType;
  description: string;
  raw_value: string;
  original_ref: string;
}

export interface DuplicateLink {
  id: string;
  new_record_id: string;
  original_record_id: string;
  match_score: number;
  matched_fields_json: string;
}

export interface IntersectionError {
  id: string;
  record_a_id: string;
  record_b_id: string;
  error_type: ErrorType;
  distance_meters: number;
  description: string;
}

export interface ChangeLog {
  id: string;
  batch_id: string;
  record_id: string;
  change_type: ChangeType;
  description: string;
  created_at: string;
}

export interface FilterOptions {
  status: RecordStatus | "all";
  intersection_error: boolean | null;
  bad_data: boolean | null;
  batch_id: string | null;
  keyword: string;
}

export interface ImportResult {
  batch: ImportBatch;
  added_count: number;
  duplicate_count: number;
  intersection_error_count: number;
  bad_data_count: number;
}

export interface ChangeSummary {
  batch: ImportBatch;
  adds: ChangeLog[];
  duplicates: ChangeLog[];
  intersection_errors: ChangeLog[];
  bad_data: ChangeLog[];
}
