export type AnomalyType = 'value_out_of_range' | 'unit_mismatch' | 'floor_mismatch' | 'other';

export type PointStatus = 'pending' | 'confirmed' | 'resolved';

export type ViewMode = 'all' | 'anomaly' | 'normal' | 'mixed';

export interface BoomPoint {
  id: string;
  boomId: string;
  timestamp: number;
  value: number;
  unit: string;
  floor: number;
  floorUnit: string;
  isAnomaly: boolean;
  anomalyType?: AnomalyType;
  currentRemark: string;
  status: PointStatus;
  materialId: string;
}

export interface RemarkHistory {
  id: string;
  pointId: string;
  remark: string;
  timestamp: number;
  operator: string;
}

export interface ScreenshotHistory {
  id: string;
  pointId: string;
  dataUrl: string;
  timestamp: number;
  description: string;
}

export type TraceNodeType = 'system' | 'model' | 'data' | 'point';

export interface TraceNode {
  id: string;
  name: string;
  type: TraceNodeType;
  timestamp: number;
}

export interface MaterialTrace {
  id: string;
  pointId: string;
  source: string;
  rawData: string;
  chain: TraceNode[];
}

export interface MixedUnitRecord {
  pointId: string;
  boomId: string;
  floorUnit: string;
  detectedUnit: string;
  confidence: number;
  suggestion: string;
}

export interface ChartFilters {
  boomIds: string[];
  timeRangeStart: number | null;
  timeRangeEnd: number | null;
}

export interface AppState {
  selectedPointId: string | null;
  viewMode: ViewMode;
  filters: ChartFilters;
  showOpsGuide: boolean;
  showExportModal: boolean;
}

export interface DataState {
  points: BoomPoint[];
  remarkHistory: RemarkHistory[];
  screenshotHistory: ScreenshotHistory[];
  materialTraces: MaterialTrace[];
}
