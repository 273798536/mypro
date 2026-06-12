export type RiskLevel = 'normal' | 'pending' | 'anomaly';

export interface SamplingRecord {
  id: number;
  date: string;
  area: string;
  species: string;
  wind_wave_forecast: string | null;
  tide_data: string | null;
  water_quality: string | null;
  risk_level: RiskLevel;
  risk_factors: string[];
  confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export interface SamplingRecordInput {
  date: string;
  area: string;
  species: string;
  wind_wave_forecast?: string | null;
  tide_data?: string | null;
  water_quality?: string | null;
}

export interface AffectedConclusion {
  conclusion: string;
  missing_data: string;
  impact: string;
}

export interface RiskAssessmentResult {
  record_id: number;
  risk_level: RiskLevel;
  risk_factors: string[];
  affected_conclusions: AffectedConclusion[];
}

export interface ConclusionWithSource {
  record_id: number;
  conclusion: string;
  data_sources: string[];
  risk_note: string;
}

export interface ExportReport {
  generated_at: string;
  records: SamplingRecord[];
  risk_summary: {
    normal_count: number;
    pending_count: number;
    anomaly_count: number;
  };
  conclusions_with_sources: ConclusionWithSource[];
}

export interface RiskAssessmentHistory {
  id: number;
  record_id: number;
  risk_level: RiskLevel;
  risk_factors: string[];
  affected_conclusions: AffectedConclusion[];
  assessed_at: string;
}

export interface AssessmentLog {
  id: number;
  record_id: number;
  action: string;
  detail: Record<string, unknown>;
  created_at: string;
}

export interface AnomalyGroup {
  summary: { normal: number; pending: number; anomaly: number };
  normal: SamplingRecord[];
  pending: SamplingRecord[];
  anomaly: SamplingRecord[];
}

export interface ImpactChainResult {
  record_id: number;
  risk_level: string;
  risk_factors: string[];
  affected_conclusions: AffectedConclusion[];
  note: string;
}
