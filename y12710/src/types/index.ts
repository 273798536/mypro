export type AvailabilityStatus = 'available' | 'pending' | 'recollect' | null;
export type ReviewStatus = 'none' | 'pending' | 'approved';
export type ErrorAction = 'fill_material' | 'adjust_caliber';
export type ErrorType = 'formula' | 'data' | 'counterexample';
export type WindowFunction = 'hanning' | 'hamming' | 'blackman' | 'rectangular';

export interface FourierConfig {
  sampleRate: number;
  windowSize: number;
  lowPassCutoff: number;
  highPassCutoff: number;
  windowFunction: WindowFunction;
}

export interface DataRow {
  id: string;
  draftId: string;
  index: number;
  xValue: number | null;
  yValue: number | null;
  fftAmplitude: number | null;
  filteredAmplitude: number | null;
  remark?: string;
  availability: AvailabilityStatus;
  reviewStatus: ReviewStatus;
  isDuplicate: boolean;
  isEmpty: boolean;
}

export interface VersionLog {
  id: string;
  draftId: string;
  version: string;
  changelog: string;
  timestamp: string;
  author: string;
}

export interface ErrorItem {
  id: string;
  draftId: string;
  type: ErrorType;
  description: string;
  action: ErrorAction;
  sourceRef: string;
  relatedRowId?: string;
}

export interface CounterExample {
  id: string;
  draftId: string;
  boundaryCondition: string;
  inputData: { x: number; y: number }[];
  expectedOutput: string;
  actualOutput?: string;
  passed: boolean | null;
}

export interface Draft {
  id: string;
  title: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  currentVersion: string;
  fourierConfig: FourierConfig;
  dataRows: DataRow[];
  versionLogs: VersionLog[];
  errorItems: ErrorItem[];
  counterExamples: CounterExample[];
}

export interface DraftSummary {
  id: string;
  title: string;
  author: string;
  updatedAt: string;
  currentVersion: string;
  availableCount: number;
  pendingCount: number;
  recollectCount: number;
  totalCount: number;
  lastChangelog: string;
}
