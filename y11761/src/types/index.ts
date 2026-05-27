export interface WaveSource {
  x: number;
  y: number;
  frequency: number;
  phase: number;
  amplitude: number;
}

export interface WaveParams {
  source1: WaveSource;
  source2: WaveSource;
  wavelength: number;
  speed: number;
}

export type ObstacleType = 'slit' | 'double_slit' | 'barrier' | 'reflector';

export interface Obstacle {
  id: string;
  type: ObstacleType;
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation: number;
}

export interface Measurement {
  amplitude: number;
  phase: number;
  frequency: number;
  timestamp: number;
}

export interface SamplePoint {
  id: string;
  position: { x: number; y: number };
  measurements: Measurement[];
}

export type AnomalySeverity = 'warning' | 'error';

export type AnomalyType = 
  | 'phase_out_of_bounds'
  | 'frequency_too_high'
  | 'wave_penetration'
  | 'low_fps'
  | 'sources_too_close'
  | 'obstacle_too_large';

export interface AnomalyRecord {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  message: string;
  timestamp: number;
  paramsSnapshot: WaveParams;
  correction?: {
    action: string;
    before: unknown;
    after: unknown;
  };
}

export interface ScoreBreakdown {
  category: string;
  score: number;
  maxScore: number;
  explanation: string;
}

export interface ScoreRecord {
  id: string;
  timestamp: number;
  totalScore: number;
  breakdown: ScoreBreakdown[];
  paramsSnapshot: WaveParams;
}

export interface HistoryRecord {
  id: string;
  timestamp: number;
  action: string;
  before: unknown;
  after: unknown;
  anomalyId?: string;
}

export interface DisplayOptions {
  showMesh: boolean;
  showHeatmap: boolean;
  showWaveSources: boolean;
  showSamplePoints: boolean;
  showObstacles: boolean;
}

export interface AppState {
  isPlaying: boolean;
  time: number;
  gridResolution: number;
  waveParams: WaveParams;
  obstacles: Obstacle[];
  samplePoints: SamplePoint[];
  displayOptions: DisplayOptions;
  history: HistoryRecord[];
  anomalies: AnomalyRecord[];
  scores: ScoreRecord[];
  fps: number;
  isPerformanceMode: boolean;
  activeAnomaly: AnomalyRecord | null;
}

export interface WaveHeightResult {
  height: number;
  amplitude: number;
  phase: number;
  penetration: boolean;
}

export const DEFAULT_WAVE_PARAMS: WaveParams = {
  source1: {
    x: -2,
    y: 2,
    frequency: 2,
    phase: 0,
    amplitude: 0.3,
  },
  source2: {
    x: 2,
    y: 2,
    frequency: 2,
    phase: 0,
    amplitude: 0.3,
  },
  wavelength: 1.5,
  speed: 3,
};

export const DEFAULT_DISPLAY_OPTIONS: DisplayOptions = {
  showMesh: true,
  showHeatmap: true,
  showWaveSources: true,
  showSamplePoints: true,
  showObstacles: true,
};
