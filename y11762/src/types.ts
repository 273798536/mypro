export interface RevisionRecord {
  timestamp: string;
  field: string;
  oldValue: number | string;
  newValue: number | string;
  reason: string;
}

export interface RegionData {
  id: string;
  region: string;
  policyCount: number;
  claimRate: number;
  premium: number;
  claimAmount: number;
  actuarialNote: string;
  source: string;
  revisionHistory: RevisionRecord[];
}

export interface AnomalyRecord {
  region: string;
  type: 'region_merge' | 'extreme_claim' | 'ratio_mismatch';
  message: string;
  severity: 'warning' | 'critical';
}

export type ImportMode = 'ignore' | 'overwrite' | 'append';
export type MetricType = 'claimRate' | 'premium' | 'claimAmount' | 'policyCount';

export interface AppState {
  regions: RegionData[];
  anomalies: AnomalyRecord[];
  activeMetric: MetricType;
  selectedRegion: string | null;
  hoveredRegion: string | null;
  filterRegions: string[];
  importMode: ImportMode;
  showDetail: boolean;
  showImport: boolean;

  setActiveMetric: (metric: MetricType) => void;
  setSelectedRegion: (region: string | null) => void;
  setHoveredRegion: (region: string | null) => void;
  setFilterRegions: (regions: string[]) => void;
  setImportMode: (mode: ImportMode) => void;
  setShowDetail: (show: boolean) => void;
  setShowImport: (show: boolean) => void;
  importData: (newRegions: RegionData[]) => void;
  detectAnomalies: () => void;
  loadSampleData: () => void;
}
