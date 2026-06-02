export interface Anomaly {
  id: string;
  type: 'interruption' | 'rate_change' | 'temperature_drift';
  timestamp: Date;
  cycleNumber: number;
  description: string;
  cause: string;
  suggestion: string;
  severity: 'low' | 'medium' | 'high';
  dataSources: string[];
}

export interface CycleRecord {
  id: string;
  cycleNumber: number;
  timestamp: Date;
  capacity: number;
  capacityRetention: number;
  chargeRate: number;
  dischargeRate: number;
  avgTemperature: number;
  maxTemperature: number;
  energyEfficiency: number;
  anomalies: Anomaly[];
}

export interface BatteryBatch {
  id: string;
  name: string;
  chemistry: string;
  nominalCapacity: number;
  testStartDate: Date;
  cycles: CycleRecord[];
}

export interface Filters {
  chargeRateRange: [number, number];
  temperatureRange: [number, number];
  anomalyTypes: string[];
}

export interface FittingParams {
  a: number;
  b: number;
  c: number;
  rSquared: number;
}

export interface BatteryState {
  currentBatch: BatteryBatch | null;
  currentCycleIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  filters: Filters;
  filteredCycles: CycleRecord[];
  fittingParams: FittingParams | null;
  selectedAnomaly: Anomaly | null;
  showDetailModal: boolean;
  
  setCycleIndex: (index: number) => void;
  togglePlayback: () => void;
  setPlaybackSpeed: (speed: number) => void;
  setFilters: (filters: Partial<Filters>) => void;
  selectAnomaly: (anomaly: Anomaly | null) => void;
  setShowDetailModal: (show: boolean) => void;
  calculateFitting: () => void;
  applyFilters: () => void;
  exportReport: (format: 'csv' | 'png', chartRef?: React.RefObject<HTMLDivElement>) => void;
  resetFilters: () => void;
}
