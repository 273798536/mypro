export interface SupplierQuote {
  id: string;
  name: string;
  source: string;
  price: number;
  energyConsumption: number;
  afterSales: number;
  deliveryPeriod: number;
}

export interface WeightConfig {
  price: number;
  energyConsumption: number;
  afterSales: number;
  deliveryPeriod: number;
}

export interface WeightChangeRecord {
  id: string;
  timestamp: number;
  previous: WeightConfig;
  current: WeightConfig;
  operator: string;
}

export interface DimensionScore {
  price: number;
  energyConsumption: number;
  afterSales: number;
  deliveryPeriod: number;
}

export interface ScoredSupplier {
  quote: SupplierQuote;
  dimensionScores: DimensionScore;
  weightedScore: number;
  rank: number;
  eliminated: boolean;
  eliminationReason?: string;
}

export type AnomalyType = 'zero_value' | 'negative_value' | 'extreme_outlier' | 'weight_mismatch' | 'consistency_error';

export interface Anomaly {
  id: string;
  type: AnomalyType;
  supplierId: string;
  supplierName: string;
  dimension: string;
  description: string;
  sourceReference: string;
  severity: 'warning' | 'error';
}

export interface ConsistencyCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface ConsistencyReport {
  passed: boolean;
  checks: ConsistencyCheck[];
  timestamp: number;
}

export interface JudgeNote {
  id: string;
  supplierId: string;
  dimension: string;
  content: string;
  author: string;
  timestamp: number;
}

export const DIMENSION_LABELS: Record<string, string> = {
  price: '价格',
  energyConsumption: '能耗',
  afterSales: '售后',
  deliveryPeriod: '交付期',
};

export const DIMENSION_UNITS: Record<string, string> = {
  price: '万元',
  energyConsumption: 'kW·h',
  afterSales: '分',
  deliveryPeriod: '天',
};
