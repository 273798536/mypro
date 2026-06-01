export interface FunctionConfig {
  id: string;
  expression: string;
  variable: 'x' | 'y';
  domain: {
    start: number;
    end: number;
    isReversed: boolean;
  };
  color: string;
}

export interface RotationAxis {
  axis: 'x' | 'y';
  offset: number;
}

export interface SolidParams {
  slices: number;
  precision: number;
}

export interface Issues {
  reversedInterval: boolean;
  axisConfusion: boolean;
  insufficientSlices: boolean;
}

export type HistoryType = 'create' | 'update' | 'export' | 'warning';
export type HistoryStatus = 'normal' | 'warning' | 'missing_field' | 'late_edit';

export interface HistoryRecord {
  id: string;
  timestamp: number;
  type: HistoryType;
  functionConfig: FunctionConfig;
  rotationAxis: RotationAxis;
  volume: number;
  screenshot?: string;
  remark: string;
  tags: string[];
  status: HistoryStatus;
  issues: Issues;
}

export interface Filters {
  types: HistoryType[];
  dateRange: [number, number] | null;
}

export interface AppState {
  currentFunction: FunctionConfig;
  rotationAxis: RotationAxis;
  solidParams: SolidParams;
  history: HistoryRecord[];
  selectedHistoryId: string | null;
  isPlaying: boolean;
  playbackSpeed: number;
  playbackProgress: number;
  filters: Filters;
  comparisonFunction: FunctionConfig | null;
}

export interface AppActions {
  setFunction: (fn: FunctionConfig) => void;
  setExpression: (expr: string) => void;
  setDomain: (start: number, end: number) => void;
  setRotationAxis: (axis: RotationAxis) => void;
  setSolidParams: (params: SolidParams) => void;
  addHistoryRecord: (record: Omit<HistoryRecord, 'id' | 'timestamp'>) => void;
  updateHistoryRecord: (id: string, updates: Partial<HistoryRecord>) => void;
  deleteHistoryRecord: (id: string) => void;
  selectHistory: (id: string | null) => void;
  setPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setPlaybackProgress: (progress: number) => void;
  setFilters: (filters: Filters) => void;
  setComparison: (fn: FunctionConfig | null) => void;
  reset: () => void;
  exportScreenshot: () => Promise<string>;
}

export type AppStore = AppState & AppActions;

export interface CurvePoint {
  x: number;
  y: number;
}
