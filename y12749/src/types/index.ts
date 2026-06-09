export type Difficulty = 'easy' | 'medium' | 'hard' | null;

export type EmptySetStrategy = 'skip' | 'warn' | 'fill';

export type AnomalyCategory = 'need_material' | 'need_criteria';

export type BatchStatus = 'draft' | 'processing' | 'chart_pending' | 'completed';

export interface DifficultyParams {
  batchId: string;
  easyMin: number;
  easyMax: number;
  mediumMin: number;
  mediumMax: number;
  hardMin: number;
  hardMax: number;
  targetEasyRatio: number;
  targetMediumRatio: number;
  targetHardRatio: number;
  duplicateDetectionFields: string[];
  emptySetStrategy: EmptySetStrategy;
  emptySetDefaultValue?: number;
}

export interface Problem {
  id: string;
  code: string;
  title: string;
  difficulty: Difficulty;
  score: number | null;
  tags: string[];
  isDuplicate: boolean;
  duplicateOf?: string;
  duplicateReason?: string;
  source: 'import' | 'manual';
}

export interface ScoreRecord {
  id: string;
  problemId: string;
  respondentId: string;
  score: number;
  timestamp: string;
  isAnomaly: boolean;
  anomalyReason?: string;
}

export interface EmptySetItem {
  id: string;
  field: string;
  problemId?: string;
  strategy: EmptySetStrategy;
  filledValue?: number;
  handledAt: string;
}

export interface Conclusion {
  id: string;
  key: string;
  title: string;
  value: string;
  passed: boolean;
  explanation: string;
  dataBasis: string;
  formula: string;
  speakingScript: string;
  affectedByMissingCharts: boolean;
  affectedChartNames: string[];
  historicalVersion?: Conclusion;
  createdAt: string;
  updatedAt: string;
}

export interface AnomalyItem {
  id: string;
  category: AnomalyCategory;
  title: string;
  description: string;
  nextStep: string;
  relatedProblemIds: string[];
  resolved: boolean;
}

export interface HistoricalAnswer {
  id: string;
  problemId: string;
  answer: string;
  source: string;
  recordedAt: string;
}

export interface BatchReview {
  batchId: string;
  createdAt: string;
  params: DifficultyParams;
  problems: Problem[];
  scores: ScoreRecord[];
  emptySets: EmptySetItem[];
  conclusions: Conclusion[];
  anomalies: AnomalyItem[];
  historicalAnswers: HistoricalAnswer[];
  chartsAvailable: string[];
  chartsMissing: string[];
  status: BatchStatus;
}

export interface ExportReport {
  batchId: string;
  exportedAt: string;
  overview: string;
  problemSummary: { total: number; duplicates: number; byDifficulty: Record<string, number> };
  difficultyBalance: { target: Record<string, number>; actual: Record<string, number>; gap: Record<string, number> };
  duplicateDetails: { code: string; reason: string; duplicateOf: string }[];
  conclusions: { title: string; result: string; explanation: string }[];
  anomalies: { category: string; title: string; nextStep: string }[];
}

export interface DifficultyCount {
  easy: number;
  medium: number;
  hard: number;
}
