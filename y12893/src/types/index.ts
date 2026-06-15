export type DataType = 'ship_track' | 'aquaculture_log' | 'salinity';
export type DataStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'recollect';
export type QualityIssue = 'unit_mismatch' | 'negative_depth' | 'outlier' | 'duplicate' | 'missing';

export interface Location {
  lat: number;
  lng: number;
  depth?: number;
}

export interface BaseDataRecord {
  id: string;
  type: DataType;
  timestamp: number;
  location: Location;
  source: string;
  importBatch: string;
  status: DataStatus;
  qualityIssues: QualityIssue[];
  createdAt: number;
  updatedAt: number;
  correctionHistory: CorrectionRecord[];
  resultNote?: string;
}

export interface ShipTrack extends BaseDataRecord {
  type: 'ship_track';
  vesselId: string;
  vesselName: string;
  speed: number;
  heading: number;
  powerConsumption: number;
}

export interface AquacultureLog extends BaseDataRecord {
  type: 'aquaculture_log';
  farmId: string;
  farmName: string;
  equipmentCount: number;
  dailyPowerUsage: number;
  stockDensity: number;
}

export interface SalinityData extends BaseDataRecord {
  type: 'salinity';
  stationId: string;
  salinity: number;
  unit: 'ppt' | 'psu' | '‰';
  temperature: number;
  relatedLoad: number;
}

export type DataRecord = ShipTrack | AquacultureLog | SalinityData;

export interface CorrectionRecord {
  id: string;
  timestamp: number;
  operator: string;
  before: Record<string, any>;
  after: Record<string, any>;
  reason: string;
  statusChange: { from: DataStatus; to: DataStatus };
}

export interface ProcessingTrace {
  recordId: string;
  steps: TraceStep[];
}

export interface TraceStep {
  id: string;
  timestamp: number;
  operation: string;
  operator: string;
  details: Record<string, any>;
  sourceData: string;
}

export interface QualityStats {
  total: number;
  unitMismatch: number;
  negativeDepth: number;
  available: number;
  suspended: number;
  recollect: number;
  pending: number;
}

export interface ImportResult {
  success: DataRecord[];
  duplicates: DataRecord[];
  errors: string[];
}

export interface TideCorrelation {
  correlation: number;
  explanation: string;
  anomalies: Array<{ time: number; load: number; tide: number }>;
  avgTideHeight: number;
  avgLoad: number;
  tideRange: { min: number; max: number };
  peakTideHour: number;
  lowTideHour: number;
  hourlyCorrelation: Array<{ hour: number; avgLoad: number; avgTideHeight: number }>;
}

export interface TidePrediction {
  date: number;
  predictedLoad: number;
  predictedTide: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  isPeak: boolean;
  recommendation?: string;
}

export interface ImportBatch {
  id: string;
  timestamp: number;
  source: string;
  fileName: string;
  recordCount: number;
  status: 'processing' | 'completed' | 'failed';
}

export interface Filters {
  type?: DataType[];
  status?: DataStatus[];
  qualityIssues?: QualityIssue[];
  timeRange?: { start: number; end: number };
  location?: { latMin: number; latMax: number; lngMin: number; lngMax: number };
}

export interface SceneSettings {
  showWireframe: boolean;
  showGrid: boolean;
  clippingEnabled: boolean;
  clippingPlaneY: number;
  autoRotate: boolean;
  timeOfDay: number;
}

export const DATA_TYPE_LABELS: Record<DataType, string> = {
  ship_track: '船舶轨迹',
  aquaculture_log: '养殖日志',
  salinity: '盐度监测'
};

export const STATUS_LABELS: Record<DataStatus, string> = {
  pending: '待确认',
  approved: '通过',
  rejected: '驳回',
  suspended: '暂缓',
  recollect: '重采'
};

export const STATUS_COLORS: Record<DataStatus, string> = {
  pending: '#E9C46A',
  approved: '#2A9D8F',
  rejected: '#E63946',
  suspended: '#F4A261',
  recollect: '#E76F51'
};

export const QUALITY_ISSUE_LABELS: Record<QualityIssue, string> = {
  unit_mismatch: '单位混用',
  negative_depth: '深度为负',
  outlier: '异常值',
  duplicate: '重复记录',
  missing: '数据缺失'
};

export const SALINITY_UNITS = ['ppt', 'psu', '‰'] as const;
