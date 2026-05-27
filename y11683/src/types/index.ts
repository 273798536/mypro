export type DataStatus = 'normal' | 'warning' | 'error' | 'corrected';

export type DetectionType =
  | 'backwardation'
  | 'month_gap'
  | 'volume_occlusion'
  | 'label_error'
  | 'parse_error';

export type Severity = 'warning' | 'error';

export interface FuturesData {
  id: string;
  contractMonth: string;
  price: number;
  volume: number;
  basis: number;
  timeWindow: string;
  notes: string;
  source: string;
  originalRow: number;
  status: DataStatus;
}

export interface CorrectionRecord {
  id: string;
  dataId: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  timestamp: string;
  operator: string;
  reason: string;
}

export interface DetectionResult {
  id: string;
  type: DetectionType;
  severity: Severity;
  description: string;
  originalRow: number;
  relatedDataIds: string[];
  resolved: boolean;
}

export interface Filters {
  showBackwardation: boolean;
  showWarnings: boolean;
  volumeHeatmap: boolean;
}

export interface AppState {
  data: FuturesData[];
  corrections: CorrectionRecord[];
  detections: DetectionResult[];
  selectedDataId: string | null;
  timeWindowIndex: number;
  isPlaying: boolean;
  playSpeed: number;
  filters: Filters;
}

export interface TimeWindowGroup {
  timeWindow: string;
  contracts: FuturesData[];
}

export interface CurvePoint3D {
  x: number;
  y: number;
  z: number;
  data: FuturesData;
}

export interface BackwardationSegment {
  startMonth: string;
  endMonth: string;
  spread: number;
  spreadPercent: number;
  dataIds: string[];
}

export interface MonthGap {
  beforeMonth: string;
  afterMonth: string;
  gapSize: number;
  dataIds: string[];
}

export interface VolumeOcclusion {
  monthA: string;
  monthB: string;
  overlapRatio: number;
  dataIds: string[];
}

export interface ParsedRow {
  originalRow: number;
  data: Partial<FuturesData> | null;
  error: string | null;
}