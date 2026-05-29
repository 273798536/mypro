export type DataType = 'berth' | 'handling' | 'contract' | 'weather';

export interface ValidationIssue {
  row: number;
  field: string;
  severity: 'error' | 'warning';
  message: string;
  suggestion: string;
}

export interface ImportResponse {
  success: boolean;
  recordCount: number;
  warnings: ValidationIssue[];
  missingFields: string[];
}

export interface ValidateResponse {
  valid: boolean;
  totalRows: number;
  issues: ValidationIssue[];
}

export interface PatchRecordRequest {
  type: DataType;
  rowId: string;
  updates: Record<string, unknown>;
}

export interface PatchRecordResponse {
  success: boolean;
  validation: { valid: boolean; issues: Array<{ field: string; message: string }> };
}

export type CalculationFlag = 'rate_missing' | 'weather_cross_period' | 'handling_pause' | 'rate_step_review';

export interface ExemptionDetail {
  type: 'weather' | 'other';
  hours: number;
  detail: string;
  crossPeriodBoundary?: boolean;
  stuckAt?: string;
}

export interface CalculationSegment {
  id: string;
  startTime: string;
  endTime: string;
  type: 'free' | 'chargeable';
  rateTier: string;
  rate: number;
  hours: number;
  amount: number;
  exemptions: ExemptionDetail[];
  needsReview: boolean;
  reviewReason?: string;
}

export interface AuditTrailStep {
  step: string;
  description: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  timestamp: string;
}

export interface CalculationResult {
  id: string;
  vesselName: string;
  port: string;
  berthTime: string;
  berthEnd: string;
  totalDemurrage: number;
  freePeriodHours: number;
  chargeableHours: number;
  exemptedHours: number;
  currency: string;
  flags: CalculationFlag[];
  segments: CalculationSegment[];
  auditTrail: AuditTrailStep[];
}

export interface CalculationListItem {
  id: string;
  vesselName: string;
  port: string;
  berthTime: string;
  totalDemurrage: number;
  flags: CalculationFlag[];
}

export interface ExportRequest {
  calculationIds: string[];
  format: 'csv' | 'excel';
  includeAuditTrail: boolean;
}

export interface BerthRecord {
  id: string;
  vessel_name: string;
  port: string;
  berth_start: string | null;
  berth_end: string | null;
  notice_time: string | null;
  free_period_end: string | null;
  voyage_number: string | null;
}

export interface HandlingRecord {
  id: string;
  berth_id: string;
  handling_start: string | null;
  handling_end: string | null;
  operation_type: string | null;
  quantity: number | null;
  pause_hours: number;
  pause_reason: string | null;
}

export interface ContractRate {
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
}

export interface WeatherExemption {
  id: string;
  berth_id: string | null;
  vessel_name: string | null;
  port: string | null;
  weather_start: string | null;
  weather_end: string | null;
  weather_type: string | null;
  evidence: string | null;
}
