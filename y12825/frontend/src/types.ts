export interface Sample {
  sample_id: string;
  lineage_id: string;
  collection_date: string;
  viral_load: number | null;
  original_raw_value: string;
  notes: string;
  qc_status: "clean" | "need_recheck" | "flagged";
  explanation: string;
  is_duplicate: boolean;
  import_batch_id: string;
  created_at: string;
}

export interface LineageSummary {
  lineage_id: string;
  name: string;
  sample_count: number;
  avg_viral_load: number | null;
  latest_collection_date: string | null;
  trend: string;
}

export interface LineageDetail extends LineageSummary {
  samples: Sample[];
}

export interface AnomalyItem {
  sample_id: string;
  lineage_id: string;
  collection_date: string;
  viral_load: number | null;
  expected_range_low: number;
  expected_range_high: number;
  deviation_ratio: number;
  anomaly_type: string;
  explanation: string;
}

export interface CorrectionRecord {
  id: string;
  sample_id: string;
  lineage_id: string;
  original_viral_load: number | null;
  corrected_viral_load: number | null;
  original_notes: string;
  corrected_notes: string;
  reason: string;
  created_at: string;
}

export interface QCSummary {
  total: number;
  clean: number;
  need_recheck: number;
  flagged: number;
  duplicate: number;
  anomaly_count: number;
}

export interface CorrectionPayload {
  sample_id: string;
  corrected_viral_load?: number;
  corrected_notes?: string;
  reason: string;
}

export interface ImportResult {
  batch_id: string;
  total: number;
  total_rows: number;
  clean_rows: number;
  duplicate_rows: number;
  warnings: string[];
  duplicate_sample_ids: string[];
  samples: Sample[];
}
