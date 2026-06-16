// ========== 核心数据类型定义 ==========

// 处理记录 - 分布统计和版本追踪共用的核心层
export interface ProcessingRecord {
  recordId: string;
  promptVersionId: string;
  processedAt: string;
  processedBy: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  analysisConfig: {
    ruleVersion: string;
    detectionThreshold: number;
    conflictRules: string[];
  };
  sampleCount: number;
  anomalyCount: number;
  conflictCount: number;
}

// 安全规则
export interface SecurityRule {
  ruleId: string;
  ruleCode: string;
  ruleName: string;
  ruleDescription: string;
  matchCondition: {
    type: 'regex' | 'keyword' | 'custom';
    value: string;
  };
  handlingOpinion: string;
  version: number;
  isActive: boolean;
  createdAt: string;
}

// 样本来源类型
export type SampleSourceType = 'old_table' | 'supplement' | 'normal' | 'missing_unit';

// 异常类型
export type AnomalyType = 'missing_rule' | 'label_conflict' | 'missing_unit' | 'format_error';

// 异常严重程度
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

// 异常处理状态
export type HandlingStatus = 'pending' | 'resolved' | 'ignored';

// 异常信息
export interface Anomaly {
  anomalyId: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  description: string;
  naturalDescription: string;
  relatedRuleId?: string;
  handlingStatus: HandlingStatus;
  handlingOpinion?: string;
  handledBy?: string;
  handledAt?: string;
}

// 样本数据
export interface Sample {
  sampleId: string;
  recordId: string;
  content: string;
  sourceType: SampleSourceType;
  sourceRemark?: string;
  unit?: string;
  annotationLabel: string;
  securityLabel: string;
  remark?: string;
  createdAt: string;
  matchedRules: string[];
  anomalies: Anomaly[];
}

// 提示词版本
export interface PromptVersion {
  versionId: string;
  versionNumber: string;
  releasedAt: string;
  content: string;
  remark: string;
  changes: string[];
}

// 标签冲突
export interface LabelConflict {
  conflictId: string;
  sampleId: string;
  previousLabel: string;
  currentLabel: string;
  reason: string;
  versionDiff: string;
}

// 分析结果
export interface AnalysisResult {
  resultId: string;
  recordId: string;
  distributionStats: {
    bySourceType: Record<SampleSourceType, number>;
    byAnomalyType: Record<AnomalyType, number>;
    byRuleMatch: Record<string, { matched: number; unmatched: number }>;
    bySecurityLabel: Record<string, number>;
  };
  anomalySamples: string[];
  labelConflicts: LabelConflict[];
  reproducibility: {
    runId: string;
    seed: number;
    timestamp: string;
  };
}

// 可复现快照
export interface ReproducibilitySnapshot {
  runId: string;
  seed: number;
  timestamp: string;
  analysisConfig: ProcessingRecord['analysisConfig'];
  ruleVersions: Array<{ ruleId: string; version: number }>;
  promptVersion: PromptVersion;
  sampleCount: number;
}

// 导出报告配置
export interface ExportConfig {
  format: 'pdf' | 'excel' | 'word';
  template: 'review' | 'daily';
  includeNaturalLanguage: boolean;
  includeTraceLink: boolean;
}

// UI状态
export interface UIState {
  activeTab: string;
  selectedSampleId: string | null;
  selectedAnomalyId: string | null;
  isLoading: boolean;
  loadingText: string;
}

// 应用状态（完整）
export interface AppState {
  // 处理记录层
  processingRecords: ProcessingRecord[];
  currentRecordId: string | null;
  
  // 数据
  samples: Sample[];
  securityRules: SecurityRule[];
  promptVersions: PromptVersion[];
  
  // 分析结果
  analysisResult: AnalysisResult | null;
  reproducibilitySnapshots: ReproducibilitySnapshot[];
  
  // UI
  ui: UIState;
  
  // Actions
  setCurrentRecordId: (id: string | null) => void;
  setSelectedSample: (id: string | null) => void;
  setSelectedAnomaly: (id: string | null) => void;
  setLoading: (loading: boolean, text?: string) => void;
  
  loadSampleData: (count?: number) => Promise<void>;
  importSamples: (file: File) => Promise<void>;
  bindPromptVersion: (version: Omit<PromptVersion, 'versionId'>) => void;
  runAnalysis: () => Promise<AnalysisResult | void>;
  resolveAnomaly: (anomalyId: string, opinion: string, handledBy: string) => void;
  exportReport: (config: ExportConfig) => Promise<Blob>;
  reproduceAnalysis: (runId: string) => Promise<void>;
}

// 来源类型中文映射
export const sourceTypeLabels: Record<SampleSourceType, string> = {
  old_table: '旧表导入',
  supplement: '补录备注',
  normal: '正常录入',
  missing_unit: '漏填单位'
};

// 异常类型中文映射
export const anomalyTypeLabels: Record<AnomalyType, string> = {
  missing_rule: '规则漏配',
  label_conflict: '标签冲突',
  missing_unit: '漏填单位',
  format_error: '格式错误'
};

// 严重程度中文映射
export const severityLabels: Record<AnomalySeverity, string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '严重'
};

// 处理状态中文映射
export const handlingStatusLabels: Record<HandlingStatus, string> = {
  pending: '待处理',
  resolved: '已处理',
  ignored: '已忽略'
};
