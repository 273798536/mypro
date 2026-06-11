export type BatchStatus = 'pending' | 'reviewing' | 'completed' | 'rejected';
export type ReviewStatus = 'pending' | 'pass' | 'fail' | 'needs_material' | 'anomaly';

export interface Batch {
  id: number;
  batch_no: string;
  batch_name: string;
  abs_name: string;
  payment_date: string;
  status: BatchStatus;
  total_amount: number | null;
  reviewer: string | null;
  created_at: string;
  updated_at: string;
}

export interface Receipt {
  id: number;
  batch_id: number;
  receipt_no: string | null;
  raw_data: string;
  trustee_name: string | null;
  payer: string | null;
  amount: number | null;
  currency: string | null;
  expected_currency: string | null;
  receipt_date: string | null;
  remark: string | null;
  is_currency_anomaly: number;
  source_file: string | null;
  created_at: string;
}

export interface ReviewRecord {
  id: number;
  receipt_id: number;
  batch_id: number;
  reviewer: string | null;
  initial_conclusion: string | null;
  manual_conclusion: string | null;
  is_manual_override: number;
  override_reason: string | null;
  override_impact: string | null;
  status: ReviewStatus;
  needs_material: string | null;
  supplementary_material: string | null;
  review_guidance: string | null;
  created_at: string;
}

export interface ReviewHistory {
  id: number;
  review_record_id: number;
  receipt_id: number;
  version: number;
  old_conclusion: string | null;
  new_conclusion: string | null;
  old_status: string | null;
  new_status: string | null;
  change_reason: string | null;
  changed_by: string | null;
  supplementary_material_added: string | null;
  new_note: string | null;
  snapshot_before: string | null;
  snapshot_after: string | null;
  created_at: string;
}

export interface CurrencyAnomaly {
  id: number;
  receipt_id: number;
  batch_id: number;
  detected_currency: string | null;
  expected_currency: string | null;
  amount: number | null;
  description: string | null;
  resolved: number;
  created_at: string;
}

export interface BatchDetail extends Batch {
  receipts: ReceiptWithReview[];
  anomalies: CurrencyAnomaly[];
  stats: {
    total: number;
    pass: number;
    pending: number;
    needs_material: number;
    anomaly: number;
    overridden: number;
  };
}

export interface ReceiptWithReview extends Receipt {
  review: ReviewRecord | null;
  histories: ReviewHistory[];
}
