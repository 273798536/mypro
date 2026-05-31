export interface DataSourceInfo {
  source: string;
  importedAt: string;
  importedBy: string;
  version: string;
}

export interface Region {
  id: string;
  name: string;
  center: [number, number];
  gridPos: { row: number; col: number };
  dataSource: {
    boundary: DataSourceInfo;
    lossRatio?: DataSourceInfo;
    premium?: DataSourceInfo;
    hazardExposure?: DataSourceInfo;
  };
  status: 'partial' | 'complete';
}

export interface MonthlyMetrics {
  regionId: string;
  year: number;
  month: number;
  lossRatio?: number;
  premium?: number;
  hazardExposure?: number;
}

export type AnomalyType = 'overlap' | 'missing_month' | 'extreme_value' | 'partial_data';
export type AnomalySeverity = 'low' | 'medium' | 'high';
export type AnomalyStatus = 'pending' | 'confirmed' | 'resolved' | 'dismissed';

export interface Anomaly {
  id: string;
  type: AnomalyType;
  regionId: string;
  month?: number;
  description: string;
  severity: AnomalySeverity;
  status: AnomalyStatus;
  detectedAt: string;
  judgment?: string;
}

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
}

export interface FilterSettings {
  minPremium?: number;
  maxPremium?: number;
  minLossRatio?: number;
  maxLossRatio?: number;
  regions: string[];
}

export interface ColorMap {
  low: string;
  mediumLow: string;
  medium: string;
  mediumHigh: string;
  high: string;
}

export interface AnalysisSession {
  id: string;
  name: string;
  timestamp: string;
  viewState: {
    camera: CameraState;
    timePosition: { year: number; month: number };
    filters: FilterSettings;
  };
  parameters: {
    lossRatioThresholds: [number, number, number, number];
    colorMapping: ColorMap;
    heightScale: number;
  };
  anomalies: Record<string, AnomalyStatus>;
  hash: string;
}

export interface AppState {
  regions: Region[];
  monthlyData: Record<string, MonthlyMetrics[]>;
  currentTime: { year: number; month: number };
  selectedRegionId: string | null;
  hoveredRegionId: string | null;
  anomalies: Anomaly[];
  sessions: AnalysisSession[];
  currentSessionId: string | null;
  isPlaying: boolean;
  playSpeed: number;
  parameters: {
    lossRatioThresholds: [number, number, number, number];
    heightScale: number;
  };
  filters: FilterSettings;
}

export interface AppActions {
  setCurrentTime: (time: { year: number; month: number }) => void;
  selectRegion: (regionId: string | null) => void;
  hoverRegion: (regionId: string | null) => void;
  setPlaying: (playing: boolean) => void;
  setPlaySpeed: (speed: number) => void;
  updateParameters: (params: Partial<AppState['parameters']>) => void;
  updateFilters: (filters: Partial<FilterSettings>) => void;
  updateAnomalyStatus: (anomalyId: string, status: AnomalyStatus, judgment?: string) => void;
  importRegionData: (region: Region, metrics: MonthlyMetrics[]) => void;
  updateRegionIncrementally: (regionId: string, updates: Partial<Region>) => void;
  updateMetricsIncrementally: (regionId: string, updates: Partial<MonthlyMetrics>, month: number, year: number) => void;
  saveSession: (name: string) => string | null;
  loadSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  getCurrentMetrics: (regionId: string) => MonthlyMetrics | undefined;
  getRegionAnomalies: (regionId: string) => Anomaly[];
}
