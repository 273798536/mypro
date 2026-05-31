export type ErrorType = 'missing_keypoint' | 'measure_misalignment' | 'hand_confusion';
export type ErrorSource = 'automatic' | 'manual';
export type ErrorSeverity = 'low' | 'medium' | 'high';
export type HandType = 'left' | 'right';

export interface FingerKeypoint {
  id: string;
  x: number;
  y: number;
  z: number;
  confidence: number;
  fingerName: string;
  isMissing?: boolean;
}

export interface HandKeyframe {
  id: string;
  timestamp: number;
  hand: HandType;
  fingerKeypoints: FingerKeypoint[];
  dataGap: boolean;
  dataGapReason?: string;
}

export interface ErrorEvent {
  id: string;
  timestamp: number;
  type: ErrorType;
  source: ErrorSource;
  description: string;
  affectedKeyframeIds: string[];
  measureNumber: number;
  isRetroactivelyAdded: boolean;
  addedAt?: number;
  severity: ErrorSeverity;
}

export interface ScoreMeasure {
  measureNumber: number;
  startTime: number;
  endTime: number;
  notes: string[];
  hand: HandType | 'both';
}

export interface ScreenshotExport {
  id: string;
  timestamp: number;
  measureNumber: number;
  keypointIds: string[];
  imageDataUrl: string;
  exportedAt: number;
}

export interface PracticeSession {
  id: string;
  title: string;
  date: string;
  pieceName: string;
  totalDuration: number;
  keyframes: HandKeyframe[];
  errors: ErrorEvent[];
  measures: ScoreMeasure[];
  screenshots: ScreenshotExport[];
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  playbackSpeed: number;
  selectedErrorId: string | null;
}

export interface ErrorStats {
  missingKeypoint: number;
  measureMisalignment: number;
  handConfusion: number;
  total: number;
}

export const ERROR_TYPE_LABELS: Record<ErrorType, string> = {
  missing_keypoint: '关键点丢失',
  measure_misalignment: '小节错位',
  hand_confusion: '左右手混淆',
};

export const ERROR_SOURCE_LABELS: Record<ErrorSource, string> = {
  automatic: '自动检测',
  manual: '人工补录',
};

export const ERROR_COLORS: Record<ErrorType, string> = {
  missing_keypoint: '#E74C3C',
  measure_misalignment: '#F39C12',
  hand_confusion: '#9B59B6',
};

export const HAND_COLORS: Record<HandType, string> = {
  left: '#3498DB',
  right: '#E67E22',
};

export const NORMAL_KEYPOINT_COLOR = '#2ECC71';
export const DATA_GAP_COLOR = 'rgba(231, 76, 60, 0.3)';
