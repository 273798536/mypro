export type TimeUnit = 's' | 'min' | 'h' | 'd';

export type AnomalyType = 
  | 'background_not_deducted' 
  | 'interval_error' 
  | 'abnormal_peak' 
  | 'boundary_error';

export type AnomalySeverity = 'warning' | 'error';

export interface DataPoint {
  id: string;
  time: number;
  count: number;
  correctedCount?: number;
  isAbnormal?: boolean;
  abnormalType?: AnomalyType;
}

export interface BackgroundNoise {
  value: number;
  measuredTime?: number;
  isDeducted: boolean;
}

export interface MaterialInfo {
  name: string;
  halfLifeKnown?: number;
  unit: TimeUnit;
}

export interface Anomaly {
  type: AnomalyType;
  severity: AnomalySeverity;
  message: string;
  location: {
    dataPointId?: string;
    time?: number;
    row?: number;
  };
  suggestion: string;
}

export interface FitResult {
  id: string;
  timestamp: number;
  halfLife: number;
  halfLifeUnit: TimeUnit;
  decayConstant: number;
  initialActivity: number;
  rSquared: number;
  dataPoints: DataPoint[];
  background: BackgroundNoise;
  material: MaterialInfo;
  anomalies: Anomaly[];
  report: string;
}

export interface FitResultDiff {
  field: string;
  oldValue: number | string;
  newValue: number | string;
  difference: number | string;
  percentage?: number;
}

export interface UnitConversion {
  unit: TimeUnit;
  label: string;
  toSeconds: number;
}

export const UNIT_CONVERSIONS: UnitConversion[] = [
  { unit: 's', label: '秒 (s)', toSeconds: 1 },
  { unit: 'min', label: '分钟 (min)', toSeconds: 60 },
  { unit: 'h', label: '小时 (h)', toSeconds: 3600 },
  { unit: 'd', label: '天 (d)', toSeconds: 86400 },
];
