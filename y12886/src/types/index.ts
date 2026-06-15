export type SalinityUnit = 'PSU' | '‰';

export interface WeatherRecord {
  id: string;
  timestamp: string;
  windSpeedRaw: string;
  windSpeed: number;
  windDirection: string;
  windDirDeg: number;
  seaState: number;
  airTemp: number;
  rawNote?: string;
  isAnomaly: boolean;
  anomalyReason?: string;
}

export interface BuoyRecord {
  id: string;
  timestamp: string;
  buoyId: string;
  salinity: number;
  salinityUnit: SalinityUnit;
  salinityNormalized: number;
  waterTempRaw: string;
  waterTemp: number;
  tideLevel: number | null;
  isAnomaly: boolean;
  anomalyReason?: string;
}

export interface TideRecord {
  id: string;
  timestamp: string;
  tideLevel: number | null;
  isGap: boolean;
}

export interface ProcessOpinion {
  id: string;
  conclusion: 'safe' | 'caution' | 'danger';
  reason: string;
  confirmed: boolean;
  rejected: boolean;
  rejectReason?: string;
  confirmedAt?: string;
  runCount: number;
}

export interface WaterQualityAlert {
  id: string;
  indicator: string;
  threshold: number;
  thresholdUnit: string;
  beforeValue: number;
  afterValue: number;
  beforeJudgment: 'normal' | 'warning' | 'critical';
  afterJudgment: 'normal' | 'warning' | 'critical';
  reason: string;
  changedByExport: boolean;
}

export interface ReviewTask {
  id: string;
  status: 'running' | 'completed' | 'confirmed';
  createdAt: string;
  confirmedAt?: string;
  operator: string;
  runCount: number;
  weatherRecords: WeatherRecord[];
  buoyRecords: BuoyRecord[];
  tideRecords: TideRecord[];
  opinion: ProcessOpinion | null;
  alerts: WaterQualityAlert[];
  gapItems: GapItem[];
  supplementLog: SupplementEntry[];
}

export interface GapItem {
  id: string;
  timestamp: string;
  field: string;
  status: 'pending' | 'filled';
  filledValue?: number;
}

export interface SupplementEntry {
  id: string;
  timestamp: string;
  field: string;
  oldValue: string;
  newValue: string;
  operator: string;
}

export interface WindRoseBin {
  direction: string;
  deg: number;
  speed0to5: number;
  speed5to10: number;
  speed10to15: number;
  speed15plus: number;
}

export type SeaStateLevel = 1 | 2 | 3 | 4 | 5 | 6;

export const SEA_STATE_LABELS: Record<SeaStateLevel, string> = {
  1: '平静',
  2: '微波',
  3: '轻浪',
  4: '中浪',
  5: '大浪',
  6: '巨浪',
};

export const WIND_DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
