export type WaterLayer = 'surface' | 'middle' | 'deep';
export type SampleStatus = 'pending' | 'reviewed' | 'confirmed';
export type RiskLevel = 'none' | 'low' | 'medium' | 'high';
export type RiskType = 'buoy_offline' | 'water_missing' | 'count_anomaly';
export type ActionType = 'import' | 'revise' | 'confirm';

export interface PlanktonSample {
  id: string;
  species: string;
  count: number;
  originalCount?: number;
  x: number;
  y: number;
  z: number;
  waterLayer: WaterLayer;
  buoyId: string;
  status: SampleStatus;
  riskLevel: RiskLevel;
  sampledAt: string;
  notes?: string;
}

export interface WaterQuality {
  id: string;
  sampleId: string;
  temperature?: number;
  salinity?: number;
  ph?: number;
  dissolvedOxygen?: number;
  isMissing: boolean;
  missingFields?: string[];
}

export interface ReviewRecord {
  id: string;
  sampleId: string;
  reviewer: string;
  note: string;
  originalCount: number;
  revisedCount: number;
  judgmentChange: boolean;
  reviewedAt: string;
}

export interface RiskAlert {
  id: string;
  sampleId: string;
  type: RiskType;
  level: RiskLevel;
  description: string;
  suggestion: string;
  isResolved: boolean;
  createdAt: string;
}

export interface VersionHistory {
  id: string;
  action: ActionType;
  operator: string;
  description: string;
  snapshot: PlanktonSample[];
  diff: Record<string, { before: any; after: any }>;
  createdAt: string;
}

export interface FilterState {
  species: string[];
  waterLayers: WaterLayer[];
  countRange: [number, number];
  riskLevels: RiskLevel[];
  statuses: SampleStatus[];
}

export interface SectionState {
  horizontalY: number | null;
  verticalX: number | null;
  verticalZ: number | null;
  showSectionPlane: boolean;
}

export interface CalculationResult {
  sampleId: string;
  adjustedCount: number;
  confidence: 'high' | 'medium' | 'low';
  note: string;
}

export interface DataGap {
  sampleId: string;
  missingFields: string[];
  impact: string;
}

export interface CountSummary {
  results: CalculationResult[];
  gaps: DataGap[];
  totalCount: number;
  estimatedCount: number;
  highConfidenceCount: number;
}

export const WATER_LAYER_LABELS: Record<WaterLayer, string> = {
  surface: '表层(0-20m)',
  middle: '中层(20-100m)',
  deep: '深层(100m+)',
};

export const STATUS_LABELS: Record<SampleStatus, string> = {
  pending: '待复核',
  reviewed: '已复核',
  confirmed: '已确认',
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  none: '正常',
  low: '低风险',
  medium: '中风险',
  high: '高风险',
};

export const RISK_TYPE_LABELS: Record<RiskType, string> = {
  buoy_offline: '浮标离线',
  water_missing: '水质缺失',
  count_anomaly: '计数异常',
};

export const ACTION_LABELS: Record<ActionType, string> = {
  import: '数据导入',
  revise: '数据修正',
  confirm: '版本确认',
};

export const SPECIES_LIST = [
  '夜光藻',
  '中华哲水蚤',
  '小型拟哲水蚤',
  '强壮箭虫',
  '长尾类幼体',
  '短尾类溞状幼体',
  '海洋原甲藻',
  '尖刺伪菱形藻',
];

export const BUOY_LIST = ['BOU-A01', 'BOU-A02', 'BOU-B01', 'BOU-B02', 'BOU-C01'];
