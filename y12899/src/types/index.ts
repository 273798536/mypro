export interface BuoyData {
  id: string;
  timestamp: string;
  location: { lat: number; lng: number };
  temperature: number;
  salinity: number;
  dissolvedOxygen: number;
  pH: number;
  chlorophyll: number;
  turbidity: number;
}

export interface NoSailZone {
  id: string;
  name: string;
  polygon: { lat: number; lng: number }[];
  reason: string;
}

export interface TrajectoryPoint {
  timestamp: string;
  location: { lat: number; lng: number };
}

export interface ViolationRecord {
  id: string;
  point: TrajectoryPoint;
  zoneId: string;
  zoneName: string;
  driftReason: string;
  intercepted: boolean;
  interceptionNote: string;
}

export type WarningLevel = 'normal' | 'warning' | 'critical';

export interface WaterQualityRecord {
  id: string;
  timestamp: string;
  index: string;
  value: number;
  unit: string;
  standard: number;
  level: WarningLevel;
  reviewNotes: ReviewNote[];
}

export interface ReviewNote {
  id: string;
  timestamp: string;
  reviewer: string;
  content: string;
  isSupplement: boolean;
  source: string;
}

export interface FarmLog {
  id: string;
  date: string;
  content: string;
  isDelayed: boolean;
  delayedDays: number;
  affectedConclusions: string[];
  previousVersion?: string;
  version: number;
}

export type AnomalyCategory = 'supplement_material' | 'adjust_caliber';
export type AnomalySeverity = 'low' | 'medium' | 'high';

export interface Anomaly {
  id: string;
  title: string;
  description: string;
  category: AnomalyCategory;
  severity: AnomalySeverity;
  sourceModule: string;
  nextAction: string;
  relatedDataId: string;
}

export interface TideData {
  date: string;
  highTideTime: string;
  highTideHeight: number;
  lowTideTime: string;
  lowTideHeight: number;
  source: string;
}

export interface WeatherData {
  date: string;
  temperature: { min: number; max: number };
  windSpeed: number;
  windDirection: string;
  precipitation: number;
  source: string;
}

export interface NoSailCheckResult {
  totalPoints: number;
  violationCount: number;
  violations: ViolationRecord[];
  status: 'pass' | 'fail' | 'warning';
}

export type ReviewStatus = 'pending' | 'in_progress' | 'completed';

export interface ReviewRound {
  id: string;
  roundNumber: number;
  timestamp: string;
  status: ReviewStatus;
  tideData: TideData;
  weatherData: WeatherData;
  noSailCheck: NoSailCheckResult;
  reviewer: string;
  notes: string;
}

export interface HarvestEstimate {
  estimatedYield: number;
  unit: string;
  confidence: number;
  breakdown: {
    area: number;
    biomassPerUnit: number;
    survivalRate: number;
    correctionFactor: number;
  };
  scope: {
    temperature: { min: number; max: number };
    salinity: { min: number; max: number };
    depth: { min: number; max: number };
    cycleDays: { min: number; max: number };
  };
}

export interface FormulaInfo {
  name: string;
  formula: string;
  description: string;
  variables: { name: string; description: string; unit: string }[];
  scope: string;
}

export interface BatchInfo {
  id: string;
  name: string;
  date: string;
  area: number;
  location: string;
}
