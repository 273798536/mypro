export type DistributionStatus = 'pending' | 'paid' | 'failed' | 'disputed';
export type BatchStatus = 'processing' | 'completed' | 'partial_failed';
export type ErrorType = 'empty_row' | 'missing_column' | 'format_error' | 'invalid_deduction' | 'invalid_bank_receipt';
export type DeductionType = 'sponsor' | 'penalty' | 'other';

export interface Distribution {
  id: string;
  event_id: string;
  batch_id: string;
  player_name: string;
  rank: number;
  is_tied: boolean;
  tied_rank_group_id?: string;
  gross_prize: number;
  total_deductions: number;
  taxable_amount: number;
  tax_rate: number;
  tax_amount: number;
  net_amount: number;
  status: DistributionStatus;
  bank_card_last4: string;
  has_dispute: boolean;
  has_duplicate_resend: boolean;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface BadRow {
  id: string;
  event_id: string;
  raw_line: string;
  line_number: number;
  error_type: ErrorType;
  error_description: string;
  source: string;
  created_at: string;
}

export interface TiedRankGroup {
  id: string;
  event_id: string;
  rank: number;
  players?: Distribution[];
}

export interface Deduction {
  id: string;
  distribution_id: string;
  type: DeductionType;
  description: string;
  amount: number;
  source: string;
}

export interface Correction {
  id: string;
  distribution_id: string;
  field: string;
  old_value: string;
  new_value: string;
  reason: string;
  source_note: string;
  operator: string;
  created_at: string;
}

export interface Batch {
  id: string;
  event_id: string;
  status: BatchStatus;
  total_count: number;
  paid_count: number;
  failed_count: number;
  created_at: string;
  completed_at?: string;
}

export interface Event {
  id: string;
  name: string;
  description: string;
  event_date: string;
}

export interface CalculationStep {
  step: number;
  label: string;
  amount: number;
  description: string;
}

export interface DistributionDetail {
  distribution: Distribution;
  calculation_chain: CalculationStep[];
  deductions: Deduction[];
  batch: Batch;
  corrections: Correction[];
}

export interface DistributionListResponse {
  total: number;
  data: Distribution[];
  bad_rows: BadRow[];
  tied_rank_groups: TiedRankGroup[];
}

export interface CorrectionRequest {
  field: 'net_amount' | 'status' | 'bank_card_last4';
  new_value: string;
  reason: string;
  source_note: string;
}

export interface CorrectionWithDistribution extends Correction {
  distribution: Pick<Distribution, 'id' | 'player_name' | 'rank' | 'event_id'>;
}
