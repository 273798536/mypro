export type AnomalyType = 'duplicate' | 'rule_missing' | 'format_error' | 'leak';
export type Severity = 'high' | 'medium' | 'low';
export type AnomalyStatus = 'pending' | 'processing' | 'resolved' | 'ignored';
export type LogStatus = 'pass' | 'warn' | 'fail';

export interface Batch {
  id: string;
  fileName: string;
  summary: string;
  runAt: string;
  totalSamples: number;
  anomalyCount: number;
}

export interface AnomalyMetrics {
  similarity?: number;
  coverage?: number;
  score?: number;
  deviation?: number;
}

export interface Anomaly {
  id: string;
  batchId: string;
  type: AnomalyType;
  rawCode: string;
  humanReason: string;
  severity: Severity;
  originalText: string;
  status: AnomalyStatus;
  metrics: AnomalyMetrics;
  duplicateOfId?: string;
  missingRuleField?: string;
  scenario?: string;
}

export interface ModelLog {
  id: string;
  anomalyId: string;
  stepIndex: number;
  stepName: string;
  status: LogStatus;
  value: string;
  description: string;
  timestamp: string;
}

export interface Correction {
  id: string;
  anomalyId: string;
  action: string;
  opinion: string;
  operator: string;
  correctedAt: string;
  isExported: boolean;
}

export interface Example {
  id: string;
  anomalyType: AnomalyType;
  scenario: string;
  title: string;
  description: string;
  data: Record<string, unknown>;
}

export const ANOMALY_TYPE_LABEL: Record<AnomalyType, string> = {
  duplicate: '脏样本重复',
  rule_missing: '安全规则漏配',
  format_error: '格式错误',
  leak: '训练验证泄漏',
};

export const ANOMALY_TYPE_COLOR: Record<AnomalyType, string> = {
  duplicate: '#ef4444',
  rule_missing: '#f59e0b',
  format_error: '#8b5cf6',
  leak: '#ec4899',
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  high: '严重',
  medium: '中等',
  low: '轻微',
};

export const STATUS_LABEL: Record<AnomalyStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已解决',
  ignored: '已忽略',
};

export const CORRECTION_ACTIONS = [
  '删除重复样本',
  '补充缺失规则',
  '修正格式',
  '从验证集移除',
  '标记为误报',
];
