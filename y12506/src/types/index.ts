export type AnomalyType = 
  | 'FRAME_MISALIGNMENT'
  | 'FREQUENCY_ALIASING'
  | 'LABEL_MISSING'
  | 'AMPLITUDE_ABNORMAL'
  | 'TIME_GAP';

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SpectrumFrame {
  id: string;
  timestamp: number;
  frameIndex: number;
  frequencies: number[];
  amplitudes: number[];
  labels?: string[];
  sourceFile?: string;
  metadata?: Record<string, unknown>;
}

export interface AudioSegment {
  id: string;
  name: string;
  sourceFile: string;
  duration: number;
  sampleRate: number;
  frames: SpectrumFrame[];
  frameRate: number;
  frequencyBins: number;
  minFrequency: number;
  maxFrequency: number;
  createdAt: Date;
  tags: string[];
}

export interface AnomalyDetail {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  message: string;
  frameIndex?: number;
  frequencyIndex?: number;
  affectedRange?: {
    startFrame: number;
    endFrame: number;
    startFreq?: number;
    endFreq?: number;
  };
  suggestion?: string;
  metadata?: Record<string, unknown>;
}

export interface ValidationResult {
  segmentId: string;
  totalFrames: number;
  validFrames: number;
  anomalies: AnomalyDetail[];
  isRejected: boolean;
  rejectionReasons: string[];
}

export interface HighlightPoint {
  frameIndex: number;
  frequencyIndex: number;
  type: 'anomaly' | 'selection' | 'peak' | 'marker';
  color?: string;
  label?: string;
  anomalyId?: string;
}

export interface WorkbenchState {
  segments: AudioSegment[];
  activeSegmentId: string | null;
  validationResults: Map<string, ValidationResult>;
  highlights: HighlightPoint[];
  selectedAnomalyId: string | null;
  viewMode: '3d' | '2d' | 'split';
  filters: {
    showAnomalies: boolean;
    showValidFrames: boolean;
    anomalyTypes: AnomalyType[];
    severityLevels: AnomalySeverity[];
  };
  cameraPosition: {
    x: number;
    y: number;
    z: number;
  };
}

export interface ThreeDPoint {
  x: number;
  y: number;
  z: number;
}

export interface ColorScale {
  minValue: number;
  maxValue: number;
  getColor: (value: number) => string;
}

export const ANOMALY_TYPE_LABELS: Record<AnomalyType, string> = {
  FRAME_MISALIGNMENT: '帧错位',
  FREQUENCY_ALIASING: '频段混叠',
  LABEL_MISSING: '标签缺失',
  AMPLITUDE_ABNORMAL: '振幅异常',
  TIME_GAP: '时间间隙'
};

export const SEVERITY_COLORS: Record<AnomalySeverity, string> = {
  low: '#22c55e',
  medium: '#fbbf24',
  high: '#f97316',
  critical: '#ef4444'
};

export const SEVERITY_LABELS: Record<AnomalySeverity, string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '严重'
};
