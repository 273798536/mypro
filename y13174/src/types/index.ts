export type RecordStatus =
  | 'PASS'
  | 'NOISE_SUSPECTED'
  | 'EXTREME_VALUE'
  | 'PENDING_CONFIRM'
  | 'CONFIRMED_PASS'
  | 'CONFIRMED_REJECT';

export type DetectionType = 'static' | 'dynamic' | 'ambient';

export interface FilterCriteria {
  dateFrom: string;
  dateTo: string;
  beamNumber: string;
  detectionType: DetectionType | '';
  status: RecordStatus | '';
}

export interface DeflectionRecord {
  id: string;
  beamNumber: string;
  detectionType: DetectionType;
  detectionTime: string;
  deflectionValue: number;
  temperature: number;
  humidity: number;
  status: RecordStatus;
  calculationFormula: string;
  threshold: { min: number; max: number };
  noiseScore: number;
  isBoundary: boolean;
  dataSource: string;
}

export interface Statistics {
  totalCount: number;
  passCount: number;
  noiseCount: number;
  extremeCount: number;
  pendingCount: number;
  confirmedCount: number;
}

export interface Remark {
  id: string;
  recordId: string;
  content: string;
  author: string;
  createdAt: string;
  version: number;
  isBackfilled: boolean;
  attachmentUrls: string[];
}

export interface Snapshot {
  id: string;
  recordId: string;
  imageUrl: string;
  version: number;
  createdAt: string;
  description: string;
  dataHash: string;
}

export interface Confirmation {
  id: string;
  recordId: string;
  valueBefore: number;
  valueAfter: number;
  statusBefore: RecordStatus;
  statusAfter: RecordStatus;
  reason: string;
  operator: string;
  confirmedAt: string;
  formulaVersion: string;
}

export interface UnifiedDataSource {
  records: DeflectionRecord[];
  statistics: Statistics;
  exceptionQueue: DeflectionRecord[];
  filterCriteria: FilterCriteria;
  lastUpdated: string;
  calculationVersion: string;
}

export interface RecalcResult {
  recordId: string;
  originalValue: number;
  recalculatedValue: number;
  isConsistent: boolean;
  formulaUsed: string;
  chartData: { index: number; original: number; recalculated: number }[];
  timestamp: string;
}

export const FORMULA_VERSION = 'v2.1.0';

export const STATUS_LABELS: Record<RecordStatus, string> = {
  PASS: '正常通过',
  NOISE_SUSPECTED: '疑似噪声',
  EXTREME_VALUE: '极端值',
  PENDING_CONFIRM: '待人工确认',
  CONFIRMED_PASS: '确认通过',
  CONFIRMED_REJECT: '确认驳回',
};

export const DETECTION_TYPE_LABELS: Record<DetectionType, string> = {
  static: '静态检测',
  dynamic: '动态检测',
  ambient: '环境检测',
};

export const STATUS_COLORS: Record<RecordStatus, { bg: string; text: string; border: string; dot: string }> = {
  PASS: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  NOISE_SUSPECTED: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-400' },
  EXTREME_VALUE: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-400' },
  PENDING_CONFIRM: { bg: 'bg-slate-500/15', text: 'text-slate-300', border: 'border-slate-500/30', dot: 'bg-slate-400' },
  CONFIRMED_PASS: { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/30', dot: 'bg-indigo-400' },
  CONFIRMED_REJECT: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30', dot: 'bg-rose-400' },
};
