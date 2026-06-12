export type BuoyDataStatus = 'available' | 'pending' | 'recollect';

export type CorrectionStatus = 'pending' | 'approved';

export type SafetyLevel = 'safe' | 'caution' | 'danger';

export interface BuoyData {
  id: string;
  stationName: string;
  timestamp: string;
  windSpeed: number;
  windDirection: number;
  waveHeight: number;
  wavePeriod: number;
  visibility: number;
  status: BuoyDataStatus;
  dataSource: string;
  createdAt: string;
  updatedAt: string;
}

export interface CorrectionRecord {
  id: string;
  buoyDataId: string;
  fieldName: string;
  fieldLabel: string;
  oldValue: number;
  newValue: number;
  unit: string;
  reason: string;
  operator: string;
  status: CorrectionStatus;
  createdAt: string;
  confirmedAt?: string;
}

export interface InspectionPhoto {
  id: string;
  title: string;
  stationName: string;
  category: string;
  imageUrl: string;
  description: string;
  hasIssue: boolean;
  issueType?: string;
  takenAt: string;
  createdAt: string;
}

export interface WindWindowResult {
  id: string;
  startTime: string;
  endTime: string;
  safetyLevel: SafetyLevel;
  safetyScore: number;
  description: string;
  parameters: CalculationParams;
  failureReason?: string;
  calculatedAt: string;
}

export interface CalculationParams {
  windSpeed: number;
  waveHeight: number;
  visibility: number;
  windSpeedThreshold: number;
  waveHeightThreshold: number;
  visibilityThreshold: number;
  durationHours: number;
}

export interface CalculationThresholds {
  windSpeed: number;
  waveHeight: number;
  visibility: number;
}

export interface PhotoCategory {
  id: string;
  name: string;
}

export const BUOY_STATUS_LABELS: Record<BuoyDataStatus, string> = {
  available: '可用',
  pending: '暂缓',
  recollect: '需重采',
};

export const CORRECTION_STATUS_LABELS: Record<CorrectionStatus, string> = {
  pending: '待确认',
  approved: '已通过',
};

export const SAFETY_LEVEL_LABELS: Record<SafetyLevel, string> = {
  safe: '安全',
  caution: '注意',
  danger: '危险',
};
