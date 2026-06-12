export interface RawSensorLog {
  id: string;
  timestamp: Date;
  rawValue: string;
  rawUnit: string;
  rawDirection?: string;
  source: string;
  lineNumber: number;
  sensorType: 'wave_height' | 'wave_speed' | 'wave_direction' | 'temperature';
}

export interface StandardizedData {
  id: string;
  timestamp: Date;
  value: number;
  unit: string;
  direction?: string;
  rawLog: RawSensorLog;
  unitConversion?: {
    fromUnit: string;
    toUnit: string;
    factor: number;
  };
  sensorType: 'wave_height' | 'wave_speed' | 'wave_direction' | 'temperature';
}

export interface UnitConversionRule {
  category: string;
  baseUnit: string;
  units: {
    [unit: string]: {
      symbol: string;
      toBase: (value: number) => number;
      fromBase: (value: number) => number;
    };
  };
}

export interface UnitMismatch {
  id: string;
  logId: string;
  expectedUnit: string;
  actualUnit: string;
  valueBefore: number;
  valueAfter: number;
  conversionFactor: number;
  severity: 'warning' | 'critical';
}

export interface DirectionReversal {
  id: string;
  logId: string;
  detectedDirection: string;
  expectedDirection?: string;
  possibleCauses: string[];
  impactScope: {
    startTime: Date;
    endTime: Date;
    affectedCount: number;
  };
  confirmed: boolean;
}

export interface ThresholdConfig {
  sensorType: string;
  min: number;
  max: number;
  unit: string;
}

export interface ThresholdAnomaly {
  id: string;
  dataId: string;
  value: number;
  threshold: {
    min: number;
    max: number;
  };
  type: 'below_min' | 'above_max';
  severity: 'warning' | 'critical';
}

export type AnomalyType = 'unit_mismatch' | 'direction_reversal' | 'threshold';
export type AnomalySeverity = 'info' | 'warning' | 'critical';
export type AnomalyStatus = 'pending' | 'confirmed' | 'dismissed';

export interface Anomaly {
  id: string;
  type: AnomalyType;
  timestamp: Date;
  severity: AnomalySeverity;
  status: AnomalyStatus;
  data: StandardizedData;
  details: UnitMismatch | DirectionReversal | ThresholdAnomaly;
  impactScope?: {
    startTime: Date;
    endTime: Date;
    affectedCount: number;
  };
  explanation: string;
  calculationNote: string;
}

export interface ParameterVersion {
  id: string;
  version: string;
  createdAt: Date;
  unitRules: UnitConversionRule[];
  thresholds: ThresholdConfig[];
}

export interface AnalysisHistory {
  id: string;
  timestamp: Date;
  sourceFile: string;
  recordCount: number;
  anomalyCount: number;
  parameterVersionId: string;
  status: 'completed' | 'pending';
  rawLogs: RawSensorLog[];
  standardizedData: StandardizedData[];
  anomalies: Anomaly[];
}

export interface AppState {
  rawLogs: RawSensorLog[];
  standardizedData: StandardizedData[];
  anomalies: Anomaly[];
  selectedAnomalyId: string | null;
  parameterVersion: ParameterVersion;
  history: AnalysisHistory[];
  currentHistoryId: string | null;
  isLoading: boolean;
  showGuide: boolean;
}

export interface AppActions {
  setRawLogs: (logs: RawSensorLog[]) => void;
  setStandardizedData: (data: StandardizedData[]) => void;
  setAnomalies: (anomalies: Anomaly[]) => void;
  setSelectedAnomalyId: (id: string | null) => void;
  addHistory: (record: AnalysisHistory) => void;
  setCurrentHistoryId: (id: string | null) => void;
  loadHistory: (id: string) => void;
  reRunAnalysis: () => void;
  setIsLoading: (loading: boolean) => void;
  setShowGuide: (show: boolean) => void;
  confirmAnomaly: (id: string) => void;
  dismissAnomaly: (id: string) => void;
  reset: () => void;
}

export type AppStore = AppState & AppActions;

export enum StorageKeys {
  HISTORY = 'buoy_alert_history',
  PARAMETER_VERSIONS = 'buoy_alert_param_versions',
  CURRENT_STATE = 'buoy_alert_current_state',
}
