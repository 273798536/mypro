export type DistanceUnit = 'm' | 'cm' | 'mm' | 'ft';
export type TemperatureUnit = 'C' | 'F' | 'K';
export type RecordStatus = 'pending' | 'calibrated' | 'anomaly';
export type AnomalyType = 
  | 'temperature_uncorrected' 
  | 'multiple_echo' 
  | 'unit_confusion' 
  | 'outlier' 
  | 'material_missing'
  | 'temperature_extreme';
export type AnomalySeverity = 'warning' | 'error';
export type Phase = 'phase1' | 'phase2';

export interface CalibrationStep {
  id: string;
  stepName: string;
  beforeValue: number;
  afterValue: number;
  formula: string;
  description: string;
  timestamp: Date;
}

export interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  description: string;
  suggestion: string;
  isResolved: boolean;
  value?: number;
  expectedRange?: [number, number];
  echoOrder?: number;
}

export interface RangingRecord {
  id: string;
  rawDistance: number;
  rawDistanceUnit: DistanceUnit;
  temperature: number;
  temperatureUnit: TemperatureUnit;
  frequency: number;
  reflectiveMaterial?: string;
  timestamp: Date;
  calibratedDistance?: number;
  standardizedDistance?: number;
  status: RecordStatus;
  source: Phase;
  calibrationSteps: CalibrationStep[];
  anomalies: Anomaly[];
  affectedByMaterial?: boolean;
  phase1Distance?: number;
  temperatureCorrection?: number;
  materialCorrection?: number;
}

export interface CalibrationConfig {
  referenceTemperature: number;
  soundSpeedAtRef: number;
  anomalyThreshold: number;
  enableMultiEchoDetection: boolean;
  autoUnitConversion: boolean;
  materialCorrectionFactors: Record<string, number>;
  multiEchoTimeThreshold: number;
  multiEchoDistanceTolerance: number;
}

export interface CalibrationSummary {
  totalRecords: number;
  calibratedCount: number;
  anomalyCount: number;
  warningCount: number;
  errorCount: number;
  averageError: number;
  maxError: number;
  temperatureImpact: number;
  materialImpact: number;
  phase: Phase;
  recordsAffectedByMaterial: number;
}

export interface ImportResult {
  success: boolean;
  records: RangingRecord[];
  errors: string[];
  warnings: string[];
}

export type ExportFormat = 'csv' | 'json';

export interface FilterState {
  status: RecordStatus | 'all';
  anomalyType: AnomalyType | 'all';
  searchText: string;
  affectedByMaterial: boolean | 'all';
}
