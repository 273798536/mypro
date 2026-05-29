export interface SpectrumFrame {
  time: number;
  frequencies: number[];
  peakFrequency: number;
  peakEnergy: number;
}

export interface VoiceLabel {
  name: string;
  freqRange: [number, number];
  energy: number;
  color: string;
}

export type IssueType = 'missing_field' | 'silent_segment' | 'sample_rate_error' | 'peak_clipping';
export type IssueSeverity = 'warning' | 'error' | 'info';

export interface QualityIssue {
  type: IssueType;
  severity: IssueSeverity;
  timeRange?: [number, number];
  message: string;
  guidance: {
    action: string;
    responsible: string;
    fileReference: string;
  };
}

export interface ViewportConfig {
  id: string;
  name: string;
  camera: {
    position: [number, number, number];
    target: [number, number, number];
  };
  createdAt: number;
}

export interface AudioAnalysisResult {
  frames: SpectrumFrame[];
  sampleRate: number;
  duration: number;
  voiceLabels: VoiceLabel[];
  issues: QualityIssue[];
  fileName: string;
}

export interface VisualParams {
  freqMin: number;
  freqMax: number;
  energyThreshold: number;
  timeWindow: number;
  barOpacity: number;
  showGrid: boolean;
  showAxes: boolean;
}

export interface PeakMarker {
  time: number;
  frequency: number;
  energy: number;
  frameIndex: number;
  freqIndex: number;
}

export const VOICE_RANGES: Array<Omit<VoiceLabel, 'energy'>> = [
  { name: '低频 (Sub-Bass)', freqRange: [20, 80], color: '#1e3a5f' },
  { name: '低频 (Bass)', freqRange: [80, 250], color: '#2563eb' },
  { name: '中低频 (Low-Mid)', freqRange: [250, 500], color: '#06b6d4' },
  { name: '中频 (Mid)', freqRange: [500, 2000], color: '#10b981' },
  { name: '中高频 (High-Mid)', freqRange: [2000, 4000], color: '#84cc16' },
  { name: '高频 (Presence)', freqRange: [4000, 8000], color: '#f59e0b' },
  { name: '超高频 (Brilliance)', freqRange: [8000, 20000], color: '#ef4444' },
];

export const DEFAULT_VISUAL_PARAMS: VisualParams = {
  freqMin: 20,
  freqMax: 20000,
  energyThreshold: -60,
  timeWindow: 10,
  barOpacity: 0.85,
  showGrid: true,
  showAxes: true,
};
