export type InstitutionType = 'bank' | 'insurance' | 'securities' | 'fund' | 'trust';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type AnomalyType = 'missing_metric' | 'region_overlap' | 'score_abnormal';

export type AnomalySeverity = 'warning' | 'error';

export interface Institution {
  id: string;
  name: string;
  type: InstitutionType;
  region: string;
  industry?: string;
  x: number;
  z: number;
}

export interface RiskScore {
  id: string;
  institutionId: string;
  score: number;
  level: RiskLevel;
  timestamp: string;
  batch: 1 | 2;
}

export interface Anomaly {
  id: string;
  type: AnomalyType;
  institutionId: string;
  description: string;
  severity: AnomalySeverity;
  relatedInstitutions?: string[];
}

export interface Correction {
  id: string;
  institutionId: string;
  oldScore: number;
  newScore: number;
  reason: string;
  createdAt: string;
}

export interface FilterState {
  institutionTypes: InstitutionType[];
  regions: string[];
  industries: string[];
  riskLevels: RiskLevel[];
  scoreRange: [number, number];
}

export interface TimeFrame {
  timestamp: string;
  label: string;
}

export interface InstitutionWithScore extends Institution {
  score: number;
  level: RiskLevel;
  anomalies: Anomaly[];
}

export const INSTITUTION_TYPES: InstitutionType[] = ['bank', 'insurance', 'securities', 'fund', 'trust'];

export const INSTITUTION_TYPE_LABELS: Record<InstitutionType, string> = {
  bank: '银行',
  insurance: '保险',
  securities: '证券',
  fund: '基金',
  trust: '信托',
};

export const REGIONS = ['华北', '华东', '华南', '华中', '西南', '西北', '东北'];

export const INDUSTRIES = ['制造业', '房地产', '金融服务', '科技', '能源', '消费', '医疗', '交通运输'];

export const RISK_LEVELS: RiskLevel[] = ['low', 'medium', 'high', 'critical'];

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
  critical: '极高风险',
};

export const ANOMALY_TYPE_LABELS: Record<AnomalyType, string> = {
  missing_metric: '指标缺失',
  region_overlap: '区域重叠',
  score_abnormal: '得分异常',
};

export const getScoreLevel = (score: number): RiskLevel => {
  if (score < 30) return 'low';
  if (score < 50) return 'medium';
  if (score < 75) return 'high';
  return 'critical';
};

export const getRiskColor = (level: RiskLevel): string => {
  const colors: Record<RiskLevel, string> = {
    low: '#2ed573',
    medium: '#ffa502',
    high: '#ff6b35',
    critical: '#ff4757',
  };
  return colors[level];
};
