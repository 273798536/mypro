export type InstitutionType = 'bank' | 'securities' | 'insurance' | 'trust';
export type RiskLevel = 'low' | 'medium' | 'high';
export type AnomalyType = 'missing_month' | 'region_overlap' | 'score_anomaly';
export type IndicatorDimension = 'capital' | 'liquidity' | 'credit' | 'market' | 'operational';
export type ExportType = 'indicators' | 'coordinates' | 'report';

export interface Institution {
  id: string;
  name: string;
  type: InstitutionType;
  region: string;
  coordinateX: number;
  coordinateZ: number;
}

export interface Indicator {
  id: string;
  institutionId: string;
  name: string;
  value: number;
  month: string;
  sourceMaterial: string;
  isMissing: boolean;
  missingMonth?: string;
  missingMaterial?: string;
  dimension: IndicatorDimension;
}

export interface RiskScore {
  id: string;
  institutionId: string;
  score: number;
  level: RiskLevel;
  month: string;
  reportId: string;
  isAnomaly: boolean;
  expectedMin: number;
  expectedMax: number;
}

export interface RiskReport {
  id: string;
  institutionId: string;
  title: string;
  content: string;
  month: string;
  author: string;
  exportRecords: ExportRecord[];
}

export interface RegionCoord {
  id: string;
  institutionId: string;
  centerX: number;
  centerZ: number;
  radius: number;
  overlappingWith: string[];
  sourceMaterial: string;
}

export interface Anomaly {
  id: string;
  institutionId: string;
  type: AnomalyType;
  description: string;
  month: string;
  material: string;
  relatedObject: string;
  resolved: boolean;
}

export interface ExportRecord {
  id: string;
  exportTime: string;
  operator: string;
  exportType: ExportType;
  materialCorrespondence: string;
}

export interface FilterState {
  selectedMonth: string;
  selectedInstitutionId: string | null;
  institutionTypes: InstitutionType[];
  riskLevels: RiskLevel[];
  indicatorDimension: IndicatorDimension;
  isPlaying: boolean;
}

export interface AppState extends FilterState {
  institutions: Institution[];
  indicators: Indicator[];
  riskScores: RiskScore[];
  riskReports: RiskReport[];
  regionCoords: RegionCoord[];
  anomalies: Anomaly[];
  
  setSelectedMonth: (month: string) => void;
  setSelectedInstitutionId: (id: string | null) => void;
  toggleInstitutionType: (type: InstitutionType) => void;
  toggleRiskLevel: (level: RiskLevel) => void;
  setIndicatorDimension: (dimension: IndicatorDimension) => void;
  setIsPlaying: (playing: boolean) => void;
  
  addExportRecord: (institutionId: string, record: ExportRecord) => void;
  markAnomalyResolved: (anomalyId: string) => void;
  
  getFilteredInstitutions: () => Institution[];
  getInstitutionRiskScore: (institutionId: string, month?: string) => RiskScore | undefined;
  getInstitutionIndicators: (institutionId: string, month?: string) => Indicator[];
  getInstitutionReports: (institutionId: string) => RiskReport[];
  getInstitutionRegionCoord: (institutionId: string) => RegionCoord | undefined;
  getInstitutionAnomalies: (institutionId: string) => Anomaly[];
  getCurrentMonthAnomalies: () => Anomaly[];
  getAvailableMonths: () => string[];
}

export const INSTITUTION_TYPE_LABELS: Record<InstitutionType, string> = {
  bank: '银行',
  securities: '证券',
  insurance: '保险',
  trust: '信托'
};

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险'
};

export const ANOMALY_TYPE_LABELS: Record<AnomalyType, string> = {
  missing_month: '指标缺月',
  region_overlap: '区域重叠',
  score_anomaly: '得分异常'
};

export const INDICATOR_DIMENSION_LABELS: Record<IndicatorDimension, string> = {
  capital: '资本充足',
  liquidity: '流动性',
  credit: '信用风险',
  market: '市场风险',
  operational: '操作风险'
};

export const RISK_COLORS: Record<RiskLevel, string> = {
  low: '#00d4aa',
  medium: '#ffb300',
  high: '#ff3b30'
};

export const ANOMALY_COLORS: Record<AnomalyType, string> = {
  missing_month: '#ff0040',
  region_overlap: '#ff8c00',
  score_anomaly: '#9c27b0'
};
