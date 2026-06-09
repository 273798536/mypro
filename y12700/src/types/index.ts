export interface MatrixCell {
  value: number | null;
  unit: string;
  sourceRow: number;
  sourceImage?: string;
  sourceNote?: string;
}

export interface MatrixData {
  id: string;
  title: string;
  rows: number;
  cols: number;
  cells: MatrixCell[][];
  createdAt: number;
  updatedAt: number;
}

export type DegradationLevel = 'none' | 'mild' | 'moderate' | 'severe';

export interface RankResult {
  rank: number;
  singularValues: number[];
  conditionNumber: number;
  tolerance: number;
  errorEstimate: number;
  maxRank: number;
  degradationLevel: DegradationLevel;
}

export type DataAvailability = 'available' | 'pending' | 'recollect';

export type AnomalyType = 'unit_missing' | 'value_invalid' | 'near_singular' | 'large_error';
export type AnomalySeverity = 'info' | 'warning' | 'error';
export type AnomalySuggestion = 'fill_material' | 'adjust_caliber' | 'recollect' | 'review';

export interface AnomalyItem {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  cellRef?: { row: number; col: number };
  message: string;
  suggestion: AnomalySuggestion;
  suggestionText: string;
}

export interface RowAvailability {
  rowIndex: number;
  availability: DataAvailability;
  reason: string;
}

export interface HistoryRecord {
  id: string;
  matrixId: string;
  title: string;
  timestamp: number;
  rankResult: RankResult;
  anomalyCount: number;
  availableCount: number;
  pendingCount: number;
  recollectCount: number;
}

export type ViewMode = 'analyst' | 'student';

export interface AppState {
  currentMatrix: MatrixData | null;
  rankResult: RankResult | null;
  anomalies: AnomalyItem[];
  rowAvailability: RowAvailability[];
  viewMode: ViewMode;
  history: HistoryRecord[];
}
