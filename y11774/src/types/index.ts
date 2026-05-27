export type AssetType = 'stock' | 'bond' | 'commodity' | 'currency';

export type QualityStatus = 'raw' | 'corrected' | 'pending_review';

export type TimeWindow = '1m' | '3m' | '6m' | '1y' | '3y' | '5y';

export interface CorrectionLog {
  id: string;
  timestamp: Date;
  field: string;
  oldValue: string;
  newValue: string;
  reason: string;
  operator: string;
}

export interface Asset {
  id: string;
  code: string;
  name: string;
  type: AssetType;
  sector: string;
  returns: Record<TimeWindow, number[]>;
  dataSource: string;
  reportReference: string;
  qualityStatus: QualityStatus;
  correctionHistory: CorrectionLog[];
}

export interface CorrelationEdge {
  source: string;
  target: string;
  coefficient: number;
  timeWindow: TimeWindow;
  isSymmetric: boolean;
  qualityStatus: QualityStatus;
}

export interface DataQualityReport {
  isSymmetric: boolean;
  asymmetricPairs: string[];
  timeWindowErrors: string[];
  nodeDensity: number;
  isOverDense: boolean;
  rawCount: number;
  correctedCount: number;
  pendingReviewCount: number;
}

export interface FilterState {
  assetTypes: AssetType[];
  sectors: string[];
  minCorrelation: number;
  maxCorrelation: number;
  timeWindow: TimeWindow;
}

export interface NodePosition {
  x: number;
  y: number;
  z: number;
}

export interface AssetNode extends Asset {
  position: NodePosition;
  vx: number;
  vy: number;
  vz: number;
}

export const ASSET_TYPE_COLORS: Record<AssetType, string> = {
  stock: '#ff6b6b',
  bond: '#4ecdc4',
  commodity: '#ff9f43',
  currency: '#a55eea',
};

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  stock: '股票',
  bond: '债券',
  commodity: '商品',
  currency: '外汇',
};

export const QUALITY_STATUS_LABELS: Record<QualityStatus, string> = {
  raw: '未处理',
  corrected: '已修正',
  pending_review: '待确认',
};

export const QUALITY_STATUS_COLORS: Record<QualityStatus, string> = {
  raw: '#f59e0b',
  corrected: '#10b981',
  pending_review: '#ef4444',
};

export const TIME_WINDOW_LABELS: Record<TimeWindow, string> = {
  '1m': '1个月',
  '3m': '3个月',
  '6m': '6个月',
  '1y': '1年',
  '3y': '3年',
  '5y': '5年',
};
