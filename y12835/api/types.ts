export interface CryoRecord {
  id: string
  type: 'freeze' | 'thaw'
  cell_line: string
  passage_number: number
  operator: string
  date: string
  freezing_medium: string
  reagent_batch_id: string
  storage_location: string
  viability_rate: number | null
  conclusion: 'success' | 'failed' | 'pending'
  status: 'usable' | 'review_needed' | 'reviewed_ok' | 'reviewed_failed'
  parent_record_id: string | null
  notes: string
  created_at: string
  updated_at: string
}

export interface MicroPhoto {
  id: string
  record_id: string
  file_path: string
  label: string
  photo_type: 'pre_freeze' | 'post_thaw' | 'observation'
  uploaded_at: string
}

export interface ReagentBatch {
  id: string
  batch_number: string
  reagent_name: string
  supplier: string
  expiry_date: string
  notes: string
}

export interface AnomalyReview {
  id: string
  record_id: string
  anomaly_type: 'missing_photo' | 'annotation_conflict' | 'viability_anomaly' | 'label_unclear'
  description: string
  actionable_hint: string
  review_status: 'pending' | 'approved' | 'rejected'
  reviewer: string | null
  review_comment: string | null
  reviewed_at: string | null
  source_material_ids: string[]
  created_at: string
}

export interface AnomalySourceLink {
  id: string
  anomaly_id: string
  source_record_id: string
}

export interface CreateRecordRequest {
  type: 'freeze' | 'thaw'
  cell_line: string
  passage_number: number
  operator: string
  date: string
  freezing_medium: string
  reagent_batch_id: string
  storage_location: string
  viability_rate?: number
  parent_record_id?: string
  notes?: string
}

export interface CreateRecordResponse {
  record: CryoRecord
  warnings: string[]
  anomaly_ids: string[]
}

export interface ImportCheckResponse {
  new_count: number
  duplicate_count: number
  conflict_count: number
  duplicates: { existing_id: string; incoming: Partial<CryoRecord>; match_field: string }[]
  conflicts: { existing_id: string; incoming: Partial<CryoRecord>; conflict_fields: string[] }[]
}

export interface StatisticsResponse {
  total_records: number
  freeze_count: number
  thaw_count: number
  success_rate: number
  review_needed_count: number
  by_cell_line: { cell_line: string; count: number; success_rate: number }[]
  by_month: { month: string; freeze_count: number; thaw_count: number; success_rate: number }[]
}

export interface LineageNode {
  record: CryoRecord
  children: LineageNode[]
}

export interface LineageResponse {
  root: CryoRecord
  children: LineageNode[]
}

export interface ReagentTraceResponse {
  batch: ReagentBatch
  linked_records: { record: CryoRecord; conclusion: string; photos: MicroPhoto[] }[]
  conclusion_summary: { success: number; failed: number; pending: number }
}

export interface RecordListQuery {
  cell_line?: string
  type?: 'freeze' | 'thaw'
  status?: string
  page?: string
  limit?: string
  search?: string
}

export interface AnomalyListQuery {
  review_status?: 'pending' | 'approved' | 'rejected'
  anomaly_type?: 'missing_photo' | 'annotation_conflict' | 'viability_anomaly' | 'label_unclear'
}

export interface ReviewRequest {
  reviewer: string
  review_comment: string
  review_status: 'approved' | 'rejected'
}

export interface ImportRequest {
  records: CreateRecordRequest[]
  resolution?: 'skip' | 'overwrite' | 'new'
}
