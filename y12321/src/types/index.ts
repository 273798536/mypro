export type RecordStatus = 'normal' | 'pending' | 'abnormal';

export type PendingReason = 'lag_relation' | 'common_trend' | 'third_variable';

export type AbnormalReason = 'too_few_samples' | 'missing_data' | 'outlier_dominance' | 'calculation_error';

export interface TimeSeriesPoint {
  date: string;
  valueA: number;
  valueB: number;
}

export interface EvidenceItem {
  id: string;
  type: 'source' | 'judgment' | 'result';
  content: string;
  timestamp: string;
  operator: 'system' | 'user';
}

export interface AnalysisRecord {
  id: string;
  metricA: string;
  metricB: string;
  timeSeriesData: TimeSeriesPoint[];
  sampleSize: number;
  groupField?: string;
  eventNote?: string;
  status: RecordStatus;
  judgment: string;
  correlationCoeff: number;
  pValue: number;
  lagValue: number;
  lagModified: boolean;
  originalLagJudgment?: string;
  pendingReason?: PendingReason;
  abnormalReason?: AbnormalReason;
  evidenceChain: EvidenceItem[];
  createdAt: string;
  updatedAt: string;
  dataSource: string;
  groupFieldAddedAt?: string;
  eventNoteAddedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  recordId: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  reason: string;
  modifiedAt: string;
  operator: string;
  impactScope: string[];
}

export interface DetectionConfig {
  minSampleSize: number;
  significantCorrelation: number;
  maxLagDays: number;
  commonTrendThreshold: number;
  outlierThreshold: number;
}

export interface CorrelationResult {
  coefficient: number;
  pValue: number;
  lagValue: number;
  maxLagCorrelation: number;
  trendCorrelationA: number;
  trendCorrelationB: number;
  outlierImpact: number;
  missingRate: number;
}

export interface DetectionResult {
  status: RecordStatus;
  judgment: string;
  pendingReason?: PendingReason;
  abnormalReason?: AbnormalReason;
}

export const DEFAULT_CONFIG: DetectionConfig = {
  minSampleSize: 30,
  significantCorrelation: 0.7,
  maxLagDays: 30,
  commonTrendThreshold: 0.8,
  outlierThreshold: 2.5,
};

export const PENDING_REASON_LABELS: Record<PendingReason, string> = {
  lag_relation: '存在滞后关系',
  common_trend: '存在共同趋势',
  third_variable: '可能存在第三变量',
};

export const ABNORMAL_REASON_LABELS: Record<AbnormalReason, string> = {
  too_few_samples: '样本量不足',
  missing_data: '数据缺失率过高',
  outlier_dominance: '异常值主导',
  calculation_error: '计算错误',
};

export const STATUS_LABELS: Record<RecordStatus, string> = {
  normal: '正常',
  pending: '待确认',
  abnormal: '异常',
};

export interface ExportOptions {
  includeNormal: boolean;
  includePending: boolean;
  includeAbnormal: boolean;
  includeEvidence: boolean;
  includeAudit: boolean;
  format: 'csv' | 'json' | 'markdown';
}
