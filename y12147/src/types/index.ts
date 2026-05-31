export interface LoadRecord {
  timestamp: string;
  loadKW: number;
  remark?: string;
}

export interface TempRecord {
  timestamp: string;
  tempC: number | null;
}

export interface EquipmentParams {
  ratedCapacityKVA: number;
  ratedVoltageKV: number;
  noLoadLossKW: number;
  loadLossKW: number;
  paramDate: string;
}

export interface LoadLossResult {
  totalLossKW: number;
  unit: "kW";
  applicableRange: string;
  failureReason?: string;
  severity: "ok" | "warning" | "error";
}

export type SuggestionMethod =
  | "linear_interpolation"
  | "nearby_station"
  | "exclude"
  | "conservative_max";

export interface TempGapSuggestion {
  method: SuggestionMethod;
  reason: string;
  actionLabel: string;
}

export interface TempGap {
  id: string;
  startIndex: number;
  endIndex: number;
  startTimestamp: string;
  endTimestamp: string;
  durationHours: number;
  affectedRecords: number;
  isPeakPeriod: boolean;
  suggestion: TempGapSuggestion;
}

export interface ExpiredParam {
  paramDate: string;
  daysExpired: number;
  suggestion: string;
}

export interface WorkingConditionGroup {
  id: string;
  label: string;
  type: "load_rate" | "time_period" | "temp_range";
}

export interface DiagnosisResult {
  gaps: TempGap[];
  peakGaps: TempGap[];
  expiredParams: ExpiredParam[];
  totalGaps: number;
  totalAffectedRecords: number;
}

export interface AnomalyExplanation {
  groupId: string;
  text: string;
}

export interface TrendPoint {
  time: string;
  lossKW: number;
  tempC: number | null;
}

export interface TrendGroupData {
  groupId: string;
  label: string;
  data: TrendPoint[];
}

export interface TrendComparison {
  groups: TrendGroupData[];
  anomalyExplanations: AnomalyExplanation[];
}

export interface MergedRecord {
  timestamp: string;
  loadKW: number;
  tempC: number | null;
  remark?: string;
  groupIds: string[];
}

export interface CalculationState {
  loadCurve: LoadRecord[];
  ambientTemp: TempRecord[];
  equipmentParams: EquipmentParams | null;
  mergedRecords: MergedRecord[];
  currentGroupId: string;
  resultsByGroup: Record<string, LoadLossResult>;
  diagnosis: DiagnosisResult | null;
  trendComparison: TrendComparison | null;
  isCalculated: boolean;
  totalRecords: number;
  validRecords: number;
  gapCount: number;
  anomalyCount: number;
  successRate: number;
}
