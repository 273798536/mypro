export interface InterpolationPoint {
  x: number;
  y: number;
  isDuplicate?: boolean;
  isExtrapolated?: boolean;
  anomalyType?: 'duplicate' | 'extrapolation' | 'oscillation';
}

export interface InterpolationConfig {
  id: string;
  functionExpression: string;
  order: number;
  sampleStart: number;
  sampleEnd: number;
  pointCount: number;
  method: 'lagrange' | 'newton';
  source: string;
  note: string;
  createdAt: number;
}

export interface AnomalyRecord {
  id: string;
  type: 'duplicate' | 'extrapolation' | 'oscillation';
  severity: 'warning' | 'error' | 'info';
  message: string;
  affectedIndices: number[];
  resolved: boolean;
  resolutionNote?: string;
  timestamp: number;
}

export interface HistoryEntry {
  id: string;
  action: string;
  configSnapshot: InterpolationConfig;
  diff: Partial<InterpolationConfig>;
  timestamp: number;
  userNote?: string;
  screenshot?: string;
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  category: 'classic' | 'custom';
  config: InterpolationConfig;
}

export interface CalculationResult {
  originalPoints: InterpolationPoint[];
  interpolatedPoints: { x: number; y: number; error: number; originalY: number }[];
  anomalies: AnomalyRecord[];
  maxError: number;
  avgError: number;
  oscillationIntensity: number;
}

export interface ReportData {
  id: string;
  generatedAt: number;
  config: InterpolationConfig;
  anomalies: AnomalyRecord[];
  statistics: {
    totalPoints: number;
    normalCount: number;
    unresolvedCount: number;
    resolvedCount: number;
    needReviewCount: number;
    byType: {
      duplicate: { count: number; resolved: number; unresolved: number; needReview: number };
      extrapolation: { count: number; resolved: number; unresolved: number; needReview: number };
      oscillation: { count: number; resolved: number; unresolved: number; needReview: number };
    };
  };
  history: HistoryEntry[];
}

export type AnomalyType = 'duplicate' | 'extrapolation' | 'oscillation';
