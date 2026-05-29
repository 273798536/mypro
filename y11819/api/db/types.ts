export interface BerthRow {
  id: string;
  vessel_name: string;
  port: string;
  berth_start: string | null;
  berth_end: string | null;
  notice_time: string | null;
  free_period_end: string | null;
  voyage_number: string | null;
  created_at: string;
}

export interface HandlingRow {
  id: string;
  berth_id: string;
  handling_start: string | null;
  handling_end: string | null;
  operation_type: string | null;
  quantity: number | null;
  pause_hours: number;
  pause_reason: string | null;
  created_at: string;
}

export interface ContractRow {
  id: string;
  vessel_name: string;
  port: string;
  free_hours: number | null;
  currency: string;
  rate_tier1: number | null;
  rate_tier1_max_days: number | null;
  rate_tier2: number | null;
  rate_tier2_max_days: number | null;
  rate_tier3: number | null;
  valid_from: string | null;
  valid_to: string | null;
  created_at: string;
}

export interface WeatherRow {
  id: string;
  berth_id: string | null;
  vessel_name: string | null;
  port: string | null;
  weather_start: string | null;
  weather_end: string | null;
  weather_type: string | null;
  evidence: string | null;
  created_at: string;
}

export interface CalculationRow {
  id: string;
  berth_id: string;
  total_demurrage: number;
  free_hours: number;
  chargeable_hours: number;
  exempted_hours: number;
  currency: string;
  calculated_at: string;
  flags: string;
}

export interface SegmentRow {
  id: string;
  calculation_id: string;
  start_time: string;
  end_time: string;
  segment_type: string;
  rate_tier: string | null;
  rate: number;
  hours: number;
  amount: number;
  exempted_hours: number;
  needs_review: number;
  review_reason: string | null;
  exemptions_json: string | null;
}
