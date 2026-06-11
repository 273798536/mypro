export interface QCMetrics {
  gcContent: number;
  q30: number;
  depth: number;
  mappingRate: number;
  duplicateRate: number;
  totalReads: number;
}

export type ContaminationType = 'pollen' | 'cross-sample' | 'other' | undefined;
export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface ContaminationResult {
  probability: number;
  type?: ContaminationType;
  evidenceLoci: string[];
  confidence: ConfidenceLevel;
  reviewed: boolean;
  reviewer?: string;
  reviewTime?: Date;
}

export type MutationType = 'missense' | 'nonsense' | 'synonymous' | 'frameshift' | 'splice';
export type FunctionalImpact = 'low' | 'medium' | 'high';

export interface Mutation {
  id: string;
  gene: string;
  exon: string;
  hgvsC: string;
  hgvsP: string;
  type: MutationType;
  mutationType: string;
  aminoAcidChange: string;
  functionalImpact: FunctionalImpact;
  confidence: number;
  siftScore: number;
  polyphenScore: number;
  position3d: { x: number; y: number; z: number };
  residueNumber: number;
  references: string[];
  annotation?: string;
  annotatedBy?: string;
}

export interface CultureRecord {
  id: string;
  date: string;
  operator: string;
  operation: string;
  notes: string;
  timestamp: Date;
}

export interface LineageNode {
  id: string;
  sampleId: string;
  parentId?: string;
  motherId?: string;
  fatherId?: string;
  childrenIds: string[];
  generation: number;
  relationToParent?: string;
  needsReview: boolean;
  reviewReason?: string;
  reviewStatus: 'pending' | 'approved' | 'rejected' | 'none';
  reviewedBy?: string;
  reviewedAt?: Date;
  requiresCorrection?: boolean;
  version: number;
  cultureRecords: CultureRecord[];
  mutations?: string[];
}

export interface Sample {
  id: string;
  name: string;
  generation: string;
  pathologyNote: string;
  qcMetrics: QCMetrics;
  contamination: ContaminationResult;
  mutations: Mutation[];
  cultureRecord?: {
    pollinationDate?: Date;
    harvestDate?: Date;
    plantingDate?: Date;
    growthCondition?: string;
    notes?: string;
    lastUpdated: Date;
  };
  lineageInfo: LineageNode;
  qcStatus: 'pass' | 'fail' | 'pending';
}

export interface BatchEffectResult {
  detected: boolean;
  blocked: boolean;
  gcDeviation: number;
  gcThreshold: number;
  pValue: number;
  comparisonBatches: string[];
  explanation: string;
  riskLevel: 'low' | 'medium' | 'high';
  historicalData: { batch: string; gcContent: number; }[];
}

export type BatchStatus = 'processing' | 'reviewing' | 'completed' | 'blocked';

export interface Batch {
  id: string;
  name: string;
  date: Date;
  description: string;
  samples: Sample[];
  batchEffect: BatchEffectResult;
  status: BatchStatus;
}

export type AnomalyType = 'missing-data' | 'contamination' | 'batch-effect' | 'lineage-conflict' | 'low-coverage' | 'quality-issue' | 'genotype-conflict' | 'uncertain-mutation';
export type AnomalyAction = 'need-materials' | 'need-recalibration' | 'pending';
export type AnomalySeverity = 'high' | 'medium' | 'low';

export interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  category?: string;
  title?: string;
  description: string;
  relatedSamples?: string[];
  sampleId?: string;
  suggestedAction: AnomalyAction;
  actionTemplate?: string;
  priority?: 'high' | 'medium' | 'low';
  resolved: boolean;
  resolution?: 'follow-suggestion' | 'override';
  resolvedBy?: string;
  resolvedAt?: Date;
  resolutionNote?: string;
  detectedAt: Date;
  evidence: string[];
}

export type ReviewRecordType = 'contamination' | 'mutation' | 'lineage' | 'anomaly';

export interface ReviewRecord {
  id: string;
  type: ReviewRecordType;
  targetId: string;
  action: string;
  comment: string;
  reviewer: string;
  timestamp: Date;
}

export interface AppState {
  currentBatch: Batch;
  selectedSampleId: string | null;
  selectedMutationId: string | null;
  anomalies: Anomaly[];
  reviewHistory: ReviewRecord[];
  lineageNodes: LineageNode[];
  setCurrentBatch: (batch: Batch) => void;
  selectSample: (id: string | null) => void;
  selectMutation: (id: string | null) => void;
  updateSample: (sampleId: string, updates: Partial<Sample>) => void;
  resolveAnomaly: (anomalyId: string, updates: Partial<Anomaly>) => void;
  addReviewRecord: (record: ReviewRecord) => void;
  updateLineageNode: (nodeId: string, updates: Partial<LineageNode>) => void;
}

export const MUTATION_TYPE_LABELS: Record<MutationType, string> = {
  missense: '错义突变',
  nonsense: '无义突变',
  synonymous: '同义突变',
  frameshift: '移码突变',
  splice: '剪接位点突变',
};

export const FUNCTIONAL_IMPACT_LABELS: Record<FunctionalImpact, string> = {
  low: '低',
  medium: '中等',
  high: '高',
};

export const CONTAMINATION_TYPE_LABELS: Record<NonNullable<ContaminationType>, string> = {
  pollen: '外来花粉污染',
  'cross-sample': '样本交叉污染',
  other: '其他污染',
};

export const ANOMALY_CATEGORY_LABELS: Record<string, string> = {
  'need-materials': '需补材料',
  'need-recalibration': '需改口径',
  pending: '待确认',
};

export const ANOMALY_ACTION_LABELS: Record<AnomalyAction, string> = {
  'need-materials': '需补材料',
  'need-recalibration': '需改口径',
  pending: '待确认',
};

export const ANOMALY_SEVERITY_LABELS: Record<AnomalySeverity, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
};

export const ANOMALY_TYPE_LABELS: Record<AnomalyType, string> = {
  'missing-data': '数据缺失',
  contamination: '样本污染',
  'batch-effect': '批次效应',
  'lineage-conflict': '谱系冲突',
  'low-coverage': '测序深度不足',
  'quality-issue': '测序质量问题',
  'genotype-conflict': '基因型冲突',
  'uncertain-mutation': '不确定突变',
};
