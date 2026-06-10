export interface Batch {
  id: string;
  name: string;
  run_at: string;
  total_reads: number;
  low_quality_reads: number;
  anomaly_count: number;
  status: "pending" | "in_review" | "closed" | "completed";
}

export interface ReadQuality {
  id: string;
  batch_id: string;
  read_id: string;
  quality_score: number;
  is_low_quality: boolean;
  reason_category: string | null;
  reason_explanation: string | null;
  anomaly_id: string | null;
}

export interface Anomaly {
  id: string;
  batch_id: string;
  read_id: string;
  culture_record_id: string | null;
  status: "pending" | "approved" | "rejected";
  created_by: string;
  created_at: string;
  read_quality?: ReadQuality;
  culture_record?: CultureRecord;
  review_actions?: ReviewAction[];
}

export interface ReviewAction {
  id: string;
  anomaly_id: string;
  action: "approve" | "reject";
  reason: string;
  operator: string;
  operated_at: string;
}

export interface CultureRecord {
  id: string;
  sample_id: string;
  conclusion: string;
  current_version: number;
  updated_at: string;
  updated_by: string;
  versions?: CultureRecordVersion[];
}

export interface CultureRecordVersion {
  id: string;
  record_id: string;
  version: number;
  conclusion: string;
  changed_by: string;
  changed_at: string;
  change_reason: string;
}

export interface ProcessingRecord {
  id: string;
  batch_id: string;
  anomaly_id: string | null;
  culture_record_id: string | null;
  action: string;
  operator: string;
  operated_at: string;
  reason: string | null;
}

export interface ReportPreview {
  batch: Batch;
  reads: ReadQuality[];
  anomalies: Anomaly[];
  processing_records: ProcessingRecord[];
  generated_at: string;
}

export interface VersionDiff {
  version1: CultureRecordVersion;
  version2: CultureRecordVersion;
}
