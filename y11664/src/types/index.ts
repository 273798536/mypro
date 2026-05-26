export interface FundData {
  id: string;
  name: string;
  code: string;
  industry: string;
  weight: number;
  volatility: number;
  maxDrawdown: number;
  returnRate: number;
  riskLevel: 'low' | 'medium' | 'high';
  source: string;
  customerNote?: string;
  lastModified: string;
  modifyHistory: ModifyRecord[];
  dataStatus: 'normal' | 'border' | 'bad';
}

export interface ModifyRecord {
  timestamp: string;
  field: string;
  oldValue: string | number;
  newValue: string | number;
  operator: string;
  reason: string;
}

export interface FilterState {
  industries: string[];
  riskLevels: string[];
  returnRange: [number, number];
  volatilityRange: [number, number];
}

export type AnomalyType = 'industry_overlap' | 'occlusion' | 'negative_return' | 'bad_data';

export interface AnomalyAlert {
  id: string;
  type: AnomalyType;
  severity: 'warning' | 'danger';
  message: string;
  relatedFunds: string[];
}

export interface ThreeDPoint {
  x: number;
  y: number;
  z: number;
  fund: FundData;
}

export const INDUSTRY_COLORS: Record<string, string> = {
  '科技': '#00d4ff',
  '医疗': '#00ff88',
  '消费': '#ff6b35',
  '金融': '#ffd700',
  '能源': '#ff3366',
  '工业': '#9966ff',
  '材料': '#66cc99',
  '公用事业': '#6699cc',
  '房地产': '#cc9966',
  '其他': '#888888'
};

export const INDUSTRIES = [
  '科技', '医疗', '消费', '金融', '能源', 
  '工业', '材料', '公用事业', '房地产', '其他'
];

export const RISK_LEVELS = ['low', 'medium', 'high'];
export const RISK_LEVEL_LABELS: Record<string, string> = {
  'low': '低风险',
  'medium': '中风险',
  'high': '高风险'
};

export const DATA_STATUS_LABELS: Record<string, string> = {
  'normal': '正常',
  'border': '边界',
  'bad': '异常'
};
