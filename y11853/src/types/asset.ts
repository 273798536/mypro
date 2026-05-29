export interface TimePoint {
  timestamp: number;
  return: number;
  volatility: number;
  drawdown: number;
}

export interface Asset {
  id: string;
  code: string;
  name: string;
  industry: string;
  weight: number;
  returns: number[];
  volatility: number;
  maxDrawdown: number;
  expectedReturn: number;
  riskLevel: 'low' | 'medium' | 'high';
  position: {
    x: number;
    y: number;
    z: number;
  };
  timeSeries: TimePoint[];
  isOccluded?: boolean;
  hasWeightAnomaly?: boolean;
}

export type RiskLevel = 'low' | 'medium' | 'high';

export const INDUSTRIES = [
  '科技',
  '金融',
  '医药',
  '消费',
  '能源',
  '制造',
  '地产',
  '通信',
  '军工',
  '农业',
] as const;

export type Industry = typeof INDUSTRIES[number];
