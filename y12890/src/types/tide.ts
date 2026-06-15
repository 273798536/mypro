import { DataStatus, TideUnit, QualityIssue } from './common';

export { TideUnit };

export interface TideRecord {
  [key: string]: unknown;
  id: string;
  taskId: string;
  pointId: string;
  recordTime: Date;
  tideLevel: number | null;
  unit: TideUnit;
  timezone: string;
  originalTimezone: string;
  source: string;
  status: DataStatus;
  note?: string;
  isDuplicate?: boolean;
  duplicateOf?: string;
  explanation?: string;
}

export interface TideCalculationResult {
  recordId: string;
  originalTime: Date;
  originalTimezone: string;
  correctedTime: Date;
  correctedTimezone: string;
  tideLevel: number;
  unit: TideUnit;
  isInterpolated: boolean;
  calculationMethod: string;
  explanation: string;
  qualityScore: number;
  issues: QualityIssue[];
}

export interface TideChartPoint {
  time: Date;
  tideLevel: number;
  isHigh?: boolean;
  isLow?: boolean;
  isInterpolated: boolean;
  status: DataStatus;
}

export interface HighLowTide {
  time: Date;
  tideLevel: number;
  type: 'high' | 'low';
  explanation: string;
}

export interface HarmonicComponent {
  name: string;
  amplitude: number;
  phase: number;
  period: number;
}

export interface TideCalculationResponse {
  results: TideCalculationResult[];
  chartData: TideChartPoint[];
  highLows: HighLowTide[];
  harmonicComponents: HarmonicComponent[];
  qualityScore: number;
  explanation: string;
  interpolatedCount: number;
  timezoneCorrectedCount: number;
}
