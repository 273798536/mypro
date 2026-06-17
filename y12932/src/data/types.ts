// 拒答边界样本看板 · 领域类型定义

export type RefusalDecision = "refuse" | "answer";
export type InterceptionResult = "intercepted" | "passed";
export type CorrectionStatus = "none" | "pending" | "corrected";
export type AnomalyType = "boundary-flip" | "leakage" | "contradiction";
export type ProcessingType = "interception" | "correction" | "leakage";
export type TrainingStatus = "待标注" | "已剔除" | "已回灌";

export interface SafetyInterception {
  result: InterceptionResult;
  rule: string;
  ruleLabel: string;
}

export interface Correction {
  status: CorrectionStatus;
  reviewer?: string;
  opinion?: string;
  before?: RefusalDecision;
  after?: RefusalDecision;
  timestamp?: string;
}

// 处理记录：单一事实源，安全拦截 / 人工修正 / 泄漏检测共用
export interface ProcessingRecord {
  id: string;
  sampleId: string;
  versionId: string;
  type: ProcessingType;
  result: string;
  reasonCode: string;
  reasonPlain: string;
  reviewer?: string;
  timestamp: string;
}

export interface Sample {
  id: string;
  versionId: string;
  group: string;
  input: string;
  expectedRefusal: boolean;
  modelResponse: string;
  refusalDecision: RefusalDecision;
  refusalScore: number; // 0~1 边界分数，越接近 0.5 越在边界
  safetyInterception: SafetyInterception;
  correction: Correction;
  processingRecordIds: string[];
  linkedTrainingSampleId?: string;
  anomalyId?: string;
}

export interface GroupMetric {
  versionId: string;
  group: string;
  total: number;
  refusalRate: number;
  correctionRate: number;
  boundaryCount: number;
  leakageCount: number;
}

export type TraceKind = "anomaly" | "sample" | "training" | "opinion";

export interface TraceNode {
  kind: TraceKind;
  label: string;
  refId: string;
  detail: string;
  hint: string;
}

export interface Anomaly {
  id: string;
  type: AnomalyType;
  sampleId: string;
  versionId: string;
  description: string;
  traceChain: TraceNode[];
}

export interface TrainingSample {
  id: string;
  source: string;
  content: string;
  status: TrainingStatus;
  opinion: string; // 处理意见
}

export interface ImportRun {
  versionId: string;
  timestamp: string;
  isReimport: boolean;
  reusedConclusion: boolean;
  deltaNote: string;
}

export interface QuestionBank {
  id: string;
  name: string;
  contentHash: string;
  importCount: number;
  firstImportVersionId: string;
}

export interface LeakageRecord {
  id: string;
  questionBankId: string;
  unifiedConclusion: string;
  reasonPlain: string;
  sampleIds: string[];
  affectedTrainingSampleIds: string[];
  importRuns: ImportRun[];
}

export interface Version {
  id: string;
  name: string;
  modelVersion: string;
  datasetVersion: string;
  questionBankHash: string;
  createdAt: string;
  sampleCount: number;
  notes: string;
}

export interface VersionMetric {
  versionId: string;
  refusalRate: number;
  boundaryCount: number;
  correctionRate: number;
  leakageCount: number;
}
