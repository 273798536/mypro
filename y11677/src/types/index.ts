export interface SensorStatus {
  temperature: number;
  voltage: number;
  signalQuality: number;
  isCalibrated: boolean;
}

export interface GyroFrame {
  timestamp: number;
  quaternion: [number, number, number, number];
  angularVelocity: [number, number, number];
  sensorStatus: SensorStatus;
  calibrationNote?: string;
  source: string;
  eulerAngles?: [number, number, number];
}

export type AnomalyType =
  | 'quaternion_not_normalized'
  | 'timestamp_out_of_order'
  | 'drift_detected'
  | 'sensor_abnormal';

export type Severity = 'warning' | 'error' | 'critical';

export interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: Severity;
  frameIndex: number;
  timestamp: number;
  description: string;
  correction?: CorrectionRecord;
  details?: Record<string, unknown>;
}

export interface CorrectionRecord {
  id: string;
  anomalyId: string;
  type: string;
  originalValue: unknown;
  correctedValue: unknown;
  operator: string;
  timestamp: number;
  note?: string;
}

export interface FlightReport {
  id: string;
  startTime: number;
  endTime: number;
  totalFrames: number;
  anomalyCount: {
    warning: number;
    error: number;
    critical: number;
  };
  calibrationRecords: CorrectionRecord[];
  summary: string;
  dataSource: string;
  exportTime: number;
  qualityScore: number;
}

export type PanelType = 'details' | 'anomalies' | 'calibration' | 'report';

export interface AppState {
  frames: GyroFrame[];
  anomalies: Anomaly[];
  corrections: CorrectionRecord[];
  currentFrameIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  selectedTimeRange: [number, number] | null;
  activePanel: PanelType;
  selectedAnomalyId: string | null;
  showGrid: boolean;
  showAxes: boolean;
  cameraAutoRotate: boolean;
  calibratedFrames?: GyroFrame[];
}
