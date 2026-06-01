export type ProductType = 'fund' | 'insurance' | 'bond' | 'derivative' | 'structured';

export type RiskLevel = 1 | 2 | 3 | 4 | 5;

export type RiskIssueType = 'risk_misalignment' | 'maturity_missing' | 'yield_exaggeration';

export type RiskSeverity = 'warning' | 'critical';

export interface ProductArchive {
  id: string;
  name: string;
  type: ProductType;
  riskLevel: RiskLevel;
  issuer: string;
  code: string;
  createTime: number;
  sourceMaterial: string;
  maturityDate?: string;
  term?: string;
}

export interface YieldRange {
  productId: string;
  expectedMin: number;
  expectedMax: number;
  historicalMin: number;
  historicalMax: number;
  benchmark: number;
  sourceMaterial: string;
}

export interface ExplanationReport {
  productId: string;
  content: string;
  reporter: string;
  reportTime: number;
  sourceMaterial: string;
  claimedYield?: number;
}

export interface RiskIssue {
  id: string;
  productId: string;
  type: RiskIssueType;
  severity: RiskSeverity;
  description: string;
  sourceMaterials: string[];
  targetObject: string;
  detectedTime: number;
}

export interface HistoryRecord {
  id: string;
  timestamp: number;
  action: string;
  productIds: string[];
  snapshot: {
    products: ProductArchive[];
    yields: YieldRange[];
    reports: ExplanationReport[];
  };
  checksum: string;
}

export interface ProductNode3D {
  productId: string;
  position: [number, number, number];
  color: string;
  scale: number;
  riskHighlight: boolean;
}

export interface Filters {
  type: ProductType | 'all';
  riskLevel: RiskLevel | 'all';
  hasMaturity: 'all' | 'yes' | 'no';
}

export interface TimelineState {
  current: number;
  playing: boolean;
  speed: number;
  startTime: number;
  endTime: number;
}

export interface MaterialConflict {
  productId: string;
  field: string;
  sources: string[];
  values: string[];
}

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  fund: '基金',
  insurance: '保险',
  bond: '债券',
  derivative: '衍生品',
  structured: '结构化',
};

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  1: 'R1 谨慎型',
  2: 'R2 稳健型',
  3: 'R3 平衡型',
  4: 'R4 进取型',
  5: 'R5 激进型',
};

export const RISK_ISSUE_LABELS: Record<RiskIssueType, string> = {
  risk_misalignment: '风险错层',
  maturity_missing: '期限缺失',
  yield_exaggeration: '收益夸大',
};

export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  1: '#2ED573',
  2: '#7CEBAB',
  3: '#FFA502',
  4: '#FF6B7A',
  5: '#FF4757',
};

export const PRODUCT_TYPE_COLORS: Record<ProductType, string> = {
  fund: '#00D4FF',
  insurance: '#A55EEA',
  bond: '#2ED573',
  derivative: '#FF6B7A',
  structured: '#FFA502',
};
