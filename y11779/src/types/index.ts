export interface PredictionRecord {
  id: string;
  date: string;
  category: string;
  predictedValue: number;
  lowerBound: number;
  upperBound: number;
  actualValue: number;
  isPromotion: boolean;
  source: string;
  confidenceLevel: number;
}

export interface GroupStats {
  groupKey: string;
  groupName: string;
  totalCount: number;
  coveredCount: number;
  coverageRate: number;
  avgError: number;
  anomalyCount: number;
  promotionCount: number;
}

export type AnomalyType = 'promotion' | 'coverage' | 'sample';
export type SeverityLevel = 'warning' | 'error';

export interface AnomalyRecord {
  id: string;
  recordId: string;
  type: AnomalyType;
  severity: SeverityLevel;
  description: string;
  timestamp: string;
  resolved: boolean;
  resolution?: string;
}

export type CorrectionType = 'adjustment' | 'annotation' | 'exclusion';

export interface CorrectionRecord {
  id: string;
  timestamp: string;
  operator: string;
  type: CorrectionType;
  targetRecordIds: string[];
  beforeValue: unknown;
  afterValue: unknown;
  reason: string;
  source: string;
}

export interface CalibrationReport {
  id: string;
  generatedAt: string;
  period: { start: string; end: string };
  overallCoverage: number;
  targetCoverage: number;
  groupStats: GroupStats[];
  anomalies: AnomalyRecord[];
  corrections: CorrectionRecord[];
  summary: string;
}

export interface DashboardMetrics {
  overallCoverage: number;
  totalRecords: number;
  totalAnomalies: number;
  categoryCount: number;
  promotionCount: number;
  targetCoverage: number;
}

export type GroupByDimension = 'category' | 'promotion' | 'none';
