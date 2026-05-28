export interface FrequencyPeak {
  frequency: number;
  amplitude: number;
  isNoise: boolean;
  index: number;
}

export type AnomalyType = 'sample_rate_mismatch' | 'noise_peak' | 'direction_error' | 'low_confidence';
export type AnomalySeverity = 'warning' | 'error';

export interface Anomaly {
  type: AnomalyType;
  severity: AnomalySeverity;
  message: string;
  suggestion: string;
  timestamp: number;
}

export interface Correction {
  field: string;
  oldValue: number | string;
  newValue: number | string;
  reason: string;
  timestamp: number;
}

export type Direction = 'approaching' | 'receding';
export type AnalysisStatus = 'pending' | 'calculating' | 'completed' | 'error';

export interface AnalysisRecord {
  id: string;
  createdAt: number;
  updatedAt: number;
  source: {
    fileName: string;
    fileSize: number;
    duration: number;
    sampleRate: number;
    importedFrom: string;
  };
  parameters: {
    baseFrequency: number;
    sampleRate: number;
    direction: Direction;
    noiseThreshold: number;
  };
  results: {
    observedFrequency: number;
    frequencyShift: number;
    velocity: number;
    confidence: number;
    peaks: FrequencyPeak[];
  };
  anomalies: Anomaly[];
  corrections: Correction[];
  status: AnalysisStatus;
}

export interface AudioData {
  buffer: AudioBuffer;
  waveform: Float32Array;
  sampleRate: number;
  duration: number;
}

export interface FFTSpectrum {
  frequencies: Float32Array;
  magnitudes: Float32Array;
  sampleRate: number;
  binCount: number;
}

export interface DopplerResult {
  observedFrequency: number;
  frequencyShift: number;
  velocity: number;
  direction: Direction;
  confidence: number;
}
