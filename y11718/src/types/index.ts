export interface Measurement {
  id: string;
  nodeNumber: number;
  tubeLength: number;
  isOutlier: boolean;
  isTemperatureCorrected: boolean;
  createdAt: string;
}

export interface ExperimentData {
  id: string;
  studentName: string;
  experimentDate: string;
  temperature: number;
  frequency: number;
  measurements: Measurement[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface LinearFitResult {
  slope: number;
  intercept: number;
  rSquared: number;
  points: { x: number; y: number }[];
}

export interface ErrorBreakdown {
  temperatureError: number;
  measurementError: number;
  frequencyError: number;
  outlierInfluence: number;
  otherErrors: number;
}

export interface Warning {
  type: 'temperature' | 'nodeNumber' | 'outlier' | 'missingData';
  message: string;
  severity: 'low' | 'medium' | 'high';
  measurementId?: string;
}

export interface CalculationResult {
  soundSpeed: number;
  theoreticalSpeed: number;
  relativeError: number;
  linearFitResult: LinearFitResult;
  errorBreakdown: ErrorBreakdown;
  warnings: Warning[];
}

export interface HistoryRecord {
  id: string;
  timestamp: string;
  operator: string;
  changeType: 'create' | 'update' | 'delete' | 'correct';
  before: Record<string, any>;
  after: Record<string, any>;
  reason: string;
}

export type TabType = 'data' | 'analysis' | 'history' | 'export';
