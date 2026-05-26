export interface OptionDataPoint {
  id: string;
  sourceRow: number;
  sourceFile: string;
  expirationDate: string;
  strikePrice: number;
  impliedVolatility: number;
  volume: number;
  openInterest: number;
  bid: number | null;
  ask: number | null;
  lastPrice: number | null;
}

export interface ProcessedDataPoint extends OptionDataPoint {
  x: number;
  y: number;
  z: number;
  anomalies: Anomaly[];
}

export type AnomalyType = 'missing_quote' | 'spike' | 'expiration_mismatch' | 'outlier';
export type AnomalySeverity = 'warning' | 'error' | 'critical';

export interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  message: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export interface Annotation {
  id: string;
  dataPointId: string;
  author: string;
  content: string;
  timestamp: string;
  revision: number;
  previousValue?: number;
  newValue?: number;
}

export interface FilterState {
  expirationDates: string[];
  strikePriceRange: [number, number];
  volatilityRange: [number, number];
  showAnomaliesOnly: boolean;
  anomalyTypes: AnomalyType[];
}

export interface AppState {
  dataPoints: ProcessedDataPoint[];
  rawData: OptionDataPoint[];
  annotations: Annotation[];
  filters: FilterState;
  selectedPoint: ProcessedDataPoint | null;
  hoveredPoint: ProcessedDataPoint | null;
  isLoading: boolean;
  error: string | null;
}

export interface AppActions {
  setDataPoints: (points: ProcessedDataPoint[]) => void;
  setRawData: (data: OptionDataPoint[]) => void;
  addAnnotation: (annotation: Omit<Annotation, 'id' | 'timestamp'>) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  setSelectedPoint: (point: ProcessedDataPoint | null) => void;
  setHoveredPoint: (point: ProcessedDataPoint | null) => void;
  resetFilters: () => void;
  loadMockData: () => void;
}

export type AppStore = AppState & AppActions;

export interface SurfaceVertex {
  x: number;
  y: number;
  z: number;
  originalPoint?: ProcessedDataPoint;
}
