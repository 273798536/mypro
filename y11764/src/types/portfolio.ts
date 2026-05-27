import type { Vector3 } from 'three';
import type { Constraint } from './constraints';

export interface Asset {
  id: string;
  name: string;
  code: string;
  expectedReturn: number;
  volatility: number;
  maxDrawdown: number;
  category?: string;
}

export interface Anomaly {
  type: 'weight_sum' | 'risk_overlap' | 'constraint_inactive';
  severity: 'error' | 'warning';
  message: string;
  details: Record<string, any>;
}

export interface Portfolio {
  id: string;
  name: string;
  source: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  weights: Record<string, number>;
  expectedReturn: number;
  volatility: number;
  maxDrawdown: number;
  sharpeRatio: number;
  status: 'normal' | 'warning' | 'error';
  anomalies: Anomaly[];
  riskContributions?: Record<string, number>;
  covariance?: number[][];
}

export interface DataSource {
  id: string;
  fileName: string;
  fileType: 'xlsx' | 'csv' | 'json';
  importDate: Date;
  importMode: 'ignore' | 'overwrite' | 'append';
  hash: string;
  portfolioIds: string[];
}

export interface VersionHistory {
  id: string;
  portfolioId: string;
  parentId?: string;
  changeDescription: string;
  modifiedBy: string;
  timestamp: Date;
  diff: Record<string, any>;
}

export interface EfficientFrontierResult {
  portfolios: Portfolio[];
  surfacePoints: Vector3[][];
  optimalPortfolio?: Portfolio;
  maxSharpePortfolio?: Portfolio;
  minVolatilityPortfolio?: Portfolio;
}

export type AxisMapping = 'return' | 'volatility' | 'drawdown';

export interface SceneSettings {
  xAxis: AxisMapping;
  yAxis: AxisMapping;
  zAxis: AxisMapping;
  showSurface: boolean;
  showPoints: boolean;
  showAxis: boolean;
  highlightOptimal: boolean;
}

export interface ImportResult {
  success: boolean;
  portfolios: Portfolio[];
  errors: string[];
  warnings: string[];
  duplicates: Portfolio[];
  dataSource?: DataSource;
}

export type ImportMode = 'ignore' | 'overwrite' | 'append';

export interface ReportData {
  portfolio: Portfolio;
  assets: Asset[];
  generatedAt: Date;
  constraints: Constraint[];
  notes?: string;
}
