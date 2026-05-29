import type { Asset } from './asset';

export type AnomalyType = 'occlusion' | 'weight' | 'filter_failure';

export type AnomalySeverity = 'warning' | 'error';

export interface Anomaly {
  type: AnomalyType;
  severity: AnomalySeverity;
  assetIds: string[];
  description: string;
}

export interface CategoryResult {
  ready: Asset[];
  needReview: Asset[];
  filterFailed: Asset[];
}

export type ChangeField = 'return' | 'volatility' | 'drawdown' | 'position';

export type ChangeDirection = 'up' | 'down';

export interface ChangePoint {
  assetId: string;
  field: ChangeField;
  change: number;
  direction: ChangeDirection;
}

export type RunType = 'first' | 'second';

export interface AnalysisResult {
  runId: string;
  runType: RunType;
  timestamp: number;
  assets: Asset[];
  anomalies: Anomaly[];
  categories: CategoryResult;
  changes?: ChangePoint[];
  bounds: {
    return: [number, number];
    volatility: [number, number];
    drawdown: [number, number];
  };
}

export interface UIState {
  selectedAssetId: string | null;
  hoveredAssetId: string | null;
  isPlaying: boolean;
  currentTimeIndex: number;
  viewMode: '3d' | 'comparison';
  showAxes: boolean;
  showGrid: boolean;
  highlightRisk: 'all' | 'low' | 'medium' | 'high';
  selectedIndustries: string[];
  riskThresholds: {
    low: number;
    medium: number;
  };
  activeRun: RunType | 'comparison';
}

export type ResultCategory = 'ready' | 'needReview' | 'filterFailed';
