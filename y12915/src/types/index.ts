export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type ReviewStatus = 'direct_use' | 'need_review' | 'rejected' | 'pending';
export type DataSource = 'batch_a' | 'batch_b' | 'batch_c' | 'random';
export type ImageType = 'product' | 'document' | 'screenshot' | 'other';

export interface ConfidenceInterval {
  mean: number;
  lower: number;
  upper: number;
  std: number;
  n: number;
}

export interface HistogramBin {
  bin: number;
  range: [number, number];
  count: number;
}

export interface GroupedCI {
  group: string;
  ci: ConfidenceInterval;
  histogram: HistogramBin[];
}

export interface EvaluationSample {
  id: string;
  originalRowNumber?: number;
  sourceFileName?: string;
  modelVersionId?: string;
  modelScore: number;
  confidenceLevel: ConfidenceLevel;
  reviewStatus: ReviewStatus;
  batchId?: string;
  dataSource?: DataSource;
  imageName?: string;
  imageUrl?: string;
  imageType?: ImageType;
  humanCorrectedScore?: number;
  correctionReason?: string;
  correctedBy?: string;
  correctedAt?: string;
  sourceNote?: string;
  dimension?: string;
  beforeScore?: number;
  afterScore?: number;
  isCorrected?: boolean;
  [key: string]: any;
}

export interface SafetyRule {
  id: string;
  name: string;
  description?: string;
  category?: string;
  pageStatus?: boolean;
  exportStatus?: boolean;
  isConsistent?: boolean;
  lastCheckedAt?: string;
  detail?: string;
  type?: 'mean' | 'sample_size' | 'ci_width' | 'correction_rate' | 'custom';
  dimension?: keyof EvaluationSample;
  threshold?: number;
  operator?: '>' | '>=' | '<' | '<=' | '==';
  actualValue?: number;
  [key: string]: any;
}

export interface ModelVersion {
  id: string;
  version: string;
  trainDate?: string;
  commitHash?: string;
  description?: string;
  batchCount?: number;
  sampleCount?: number;
  batchName?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface CorrectionLog {
  id: string;
  sampleId: string;
  oldScore: number;
  newScore: number;
  reason: string;
  operator: string;
  timestamp: string;
}

export type PrecheckType = 'safety_rules' | 'reproducibility' | 'traceability';
export type PrecheckStatus = 'pass' | 'fail' | 'warning';

export interface PrecheckResult {
  type: PrecheckType;
  name: string;
  status: PrecheckStatus;
  message: string;
  details?: Record<string, any>;
}

export interface ExportConfig {
  title: string;
  author: string;
  createdAt: string;
  versionId: string;
  includeCharts?: boolean;
  includeRawData?: boolean;
}
