export type BatchStatus = 'IMPORTED' | 'REVIEWING' | 'REVIEWED' | 'EXPORTED';
export type AnomalyType = 'DISAGREEMENT' | 'DATASET_BIAS' | 'OUTLIER';
export type AnomalyStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED';
export type OpinionAction = 'RELABEL' | 'REMOVE' | 'KEEP' | 'RESPLIT';
export type SplitTag = 'train' | 'eval';

export interface ImportSampleInput {
  sampleKey: string;
  content: string;
  splitTag: SplitTag;
  annotations: Array<{ annotator: string; label: string }>;
}

export interface ImportRequest {
  batchNo: string;
  sourceFileName?: string;
  samples: ImportSampleInput[];
}

export interface BatchSummary {
  sampleCount: number;
  agreementRate: number;
  kappa: number;
  anomalyCount: number;
  conclusionText: string;
}

export interface Batch extends BatchSummary {
  id: string;
  batchNo: string;
  fingerprint: string;
  sourceFileName?: string;
  status: BatchStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ImportResponse {
  batchId: string;
  fingerprint: string;
  reused: boolean;
  status: BatchStatus;
  summary: BatchSummary;
}

export interface SplitItem {
  sampleKey: string;
  splitTag: SplitTag;
  label?: string;
}

export interface AnomalyTrace {
  sample: { sampleKey: string; content: string; splitTag: SplitTag };
  splitList: { trainCount: number; evalCount: number; items: SplitItem[] };
  annotations: Array<{ annotator: string; label: string }>;
  conclusionBasis: string;
}

export interface ProcessingOpinion {
  action: OpinionAction;
  text: string;
  reviewer: string;
  createdAt: string;
}

export interface Anomaly {
  id: string;
  batchId: string;
  sampleId: string;
  type: AnomalyType;
  severity: 'low' | 'medium' | 'high';
  status: AnomalyStatus;
  title: string;
  description: string;
  trace: AnomalyTrace;
  opinion?: ProcessingOpinion;
}

export interface PerAnnotatorStat {
  annotator: string;
  agreeRate: number;
  count: number;
  labels: Record<string, number>;
}

export interface Conclusion {
  id: string;
  batchId: string;
  summary: string;
  perAnnotator: PerAnnotatorStat[];
  computedAt: string;
}

export interface BatchDetail {
  batch: Batch;
  conclusion: Conclusion;
}

export interface ReportRecord {
  id: string;
  batchId: string;
  html: string;
  generatedAt: string;
}

export interface ComparisonMetrics {
  agreementRate: number;
  kappa: number;
  anomalyCount: number;
  resolvedCount: number;
  biasCount: number;
}

export interface ComparisonResult {
  id: string;
  current: { id: string; batchNo: string; status: BatchStatus };
  against: { id: string; batchNo: string; status: BatchStatus };
  currentMetrics: ComparisonMetrics;
  againstMetrics: ComparisonMetrics;
  note: string;
  createdAt: string;
}

export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface DashboardSummary {
  total: number;
  byStatus: Record<BatchStatus, number>;
  openAnomalies: number;
  lastExportAt?: string;
}

export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  IMPORTED: '已导入',
  REVIEWING: '复核中',
  REVIEWED: '已复核',
  EXPORTED: '已导出',
};

export const ANOMALY_TYPE_LABELS: Record<AnomalyType, string> = {
  DISAGREEMENT: '标注不一致',
  DATASET_BIAS: '评测集偏科',
  OUTLIER: '离群标注',
};

export const ANOMALY_STATUS_LABELS: Record<AnomalyStatus, string> = {
  OPEN: '待处理',
  RESOLVED: '已处理',
  DISMISSED: '已忽略',
};

export const OPINION_ACTION_LABELS: Record<OpinionAction, string> = {
  RELABEL: '重新标注',
  REMOVE: '剔除样本',
  KEEP: '保留',
  RESPLIT: '重新切分',
};

export const STATUS_FLOW: BatchStatus[] = ['IMPORTED', 'REVIEWING', 'REVIEWED', 'EXPORTED'];

export function nextStatus(s: BatchStatus): BatchStatus | null {
  const i = STATUS_FLOW.indexOf(s);
  return i >= 0 && i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : null;
}
