export type BatchStatus = 'pending' | 'analyzing' | 'completed' | 'has_issues';

export interface Batch {
  batchId: string;
  name: string;
  sourceNote: string;
  listenerNote: string;
  createdAt: number;
  status: BatchStatus;
}

export type AudioFileType = 'original' | 'processed';
export type AudioSourceType = 'original' | 'processed';

export interface AudioFile {
  fileId: string;
  batchId: string;
  type: AudioFileType;
  sourceType: AudioFileType;
  name: string;
  sampleRate: number;
  bitDepth: number;
  duration: number;
  blobUrl: string;
  numberOfChannels: number;
  channelData: Float32Array[];
}

export type WindowType = 'hann' | 'hamming' | 'blackman' | 'rectangular';

export interface FFTSpectrum {
  spectrumId: string;
  fileId: string;
  batchId: string;
  fftSize: number;
  windowType: WindowType;
  frequencyData: Float32Array;
  timeData: Float32Array;
  binFrequencies: number[];
  sampleRate: number;
}

export type FilterType = 'lowpass' | 'highpass' | 'bandpass' | 'notch';

export interface FilterParams {
  paramsId: string;
  resultId: string;
  filterType: FilterType;
  lowFreq: number;
  highFreq: number;
  gain: number;
  order: number;
}

export interface AnalysisResult {
  resultId: string;
  batchId: string;
  originalFileId: string;
  processedFileId: string;
  paramsId: string;
  spectrumBefore: FFTSpectrum;
  spectrumAfter: FFTSpectrum;
  waveformDiff: number[];
  createdAt: number;
  analyzedAt: number;
  filteredAt: number;
  fftSize: number;
  peakFrequency: number;
  noiseFloor: number;
  snr: number;
  snrImprovement: number;
  problemCount: number;
}

export type ProblemType =
  | 'sample_rate_mismatch'
  | 'over_filtering'
  | 'frequency_aliasing'
  | 'high_noise_floor'
  | 'dc_offset'
  | 'clipping';

export type Severity = 'info' | 'warning' | 'error' | 'critical';

export interface ProblemRecord {
  problemId: string;
  batchId: string;
  type: ProblemType;
  severity: Severity;
  description: string;
  reproduceMethod: string;
  detectedAt: number;
  frequency?: number;
  magnitude?: number;
  affectedFrequencies: number[];
  suggestedAction: string;
  evidence: Record<string, string | number>;
}

export type ExportFormat = 'pdf' | 'json' | 'wav';
export type ExportContent = 'report' | 'audio' | 'full';

export interface ExportLog {
  exportId: string;
  batchId: string;
  format: ExportFormat;
  content: ExportContent;
  exportedAt: number;
  fileName: string;
}

export interface AppState {
  batches: Batch[];
  activeBatchId: string | null;
  audioFiles: Record<string, AudioFile>;
  analysisResults: Record<string, AnalysisResult>;
  problems: Record<string, ProblemRecord[]>;
  exportLogs: ExportLog[];
  isProcessing: boolean;
  processingProgress: number;
}

export interface ViewState {
  activeTab: 'workspace' | 'trace' | 'guide';
  showOriginal: boolean;
  showProcessed: boolean;
  frequencyScale: 'linear' | 'log';
  amplitudeScale: 'linear' | 'db';
  zoomLevel: number;
  scrollPosition: number;
}

export interface FFTConfig {
  fftSize: number;
  windowType: WindowType;
  overlap: number;
}

export const FFT_SIZES = [256, 512, 1024, 2048, 4096, 8192] as const;
export const DEFAULT_FFT_CONFIG: FFTConfig = {
  fftSize: 2048,
  windowType: 'hann',
  overlap: 0.5,
};

export const FREQUENCY_RANGE = {
  min: 20,
  max: 20000,
};

export const AUDIO_MIME_TYPES = [
  'audio/wav',
  'audio/mpeg',
  'audio/ogg',
  'audio/flac',
  'audio/mp4',
  'audio/aac',
];

export const SOURCE_TYPE_LABELS: Record<AudioSourceType, string> = {
  original: '原始材料',
  processed: '处理结果',
};

export const PROBLEM_TYPE_LABELS: Record<ProblemType, string> = {
  sample_rate_mismatch: '采样率不匹配',
  over_filtering: '过度滤波',
  frequency_aliasing: '频段混叠',
  high_noise_floor: '噪声底过高',
  dc_offset: '直流偏移',
  clipping: '削波失真',
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  info: '提示',
  warning: '警告',
  error: '错误',
  critical: '严重',
};

export const FILTER_TYPE_LABELS: Record<FilterType, string> = {
  lowpass: '低通滤波',
  highpass: '高通滤波',
  bandpass: '带通滤波',
  notch: '陷波滤波',
};

export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  pending: '待分析',
  analyzing: '分析中',
  completed: '已完成',
  has_issues: '存在问题',
};
