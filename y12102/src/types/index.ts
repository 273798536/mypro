export interface Judge {
  id: string;
  name: string;
  role: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  category: string;
}

export interface ScoreCategory {
  id: string;
  name: string;
  weight: number;
  unit: string;
  range: [number, number];
}

export interface Score {
  judgeId: string;
  supplierId: string;
  categoryId: string;
  value: number | null;
  timestamp: string;
}

export interface ReviewLog {
  id: string;
  type: 'appeal' | 'correction' | 'verification';
  content: string;
  judgeId: string;
  supplierId: string;
  status: 'pending' | 'resolved' | 'rejected';
  timestamp: string;
}

export interface WeightedScore {
  categoryId: string;
  score: number;
  weight: number;
  normalizedWeight: number;
}

export interface CalculationResult {
  supplierId: string;
  totalScore: number;
  weightedScores: WeightedScore[];
  rank: number;
  calculationTrace: string[];
}

export interface ConsistencyResult {
  cronbachAlpha: number;
  cronbachAlphaStatus: 'pass' | 'warning' | 'fail';
  cronbachAlphaReason: string;
  cronbachAlphaScope: string;

  kendallCoefficient: number;
  kendallStatus: 'pass' | 'warning' | 'fail';
  kendallReason: string;
  kendallScope: string;

  extremeJudges: string[];
  extremeReasons: { [judgeId: string]: string };

  weightNormalization: {
    isNormalized: boolean;
    originalSum: number;
    normalizedSum: number;
    reason: string;
    scope: string;
  };

  missingScores: {
    count: number;
    details: { judgeId: string; supplierId: string; categoryId: string }[];
    reason: string;
    scope: string;
  };
}

export interface SensitivityResult {
  weightImpact: {
    categoryId: string;
    categoryName: string;
    impact: number;
    change: number;
  }[];
  scoreVolatility: {
    supplierId: string;
    supplierName: string;
    volatility: number;
    standardDeviation: number;
  }[];
  rankSensitivity: {
    originalRank: number;
    supplierId: string;
    supplierName: string;
    rankChangeWith10PercentShift: number[];
  }[];
}

export interface AppState {
  judges: Judge[];
  suppliers: Supplier[];
  categories: ScoreCategory[];
  scores: Score[];
  reviewLogs: ReviewLog[];
  calculationResults: CalculationResult[];
  consistencyResults: ConsistencyResult | null;
  sensitivityResults: SensitivityResult | null;
  activeTab: 'judges' | 'suppliers' | 'categories' | 'scores' | 'reviews';
  expandedResult: string | null;
}
